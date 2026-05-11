import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../domain/user.entity';
import {
  Person,
  DocumentType,
  PersonType,
} from '@modules/persons/domain/person.entity';
import type { CurrentUserPayload } from '@common/tenant';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}

  /**
   * Lista los usuarios visibles para la empresa activa.
   * - Excluye SUPER_ADMIN (gestionados en sección aparte).
   * - Si se pasa `activeCompanyId`, filtra por esa empresa.
   * - Si NO se pasa (SUPER_ADMIN sin empresa activa), retorna todos los
   *   no-SUPER_ADMIN. Es responsabilidad del controller decidir si pasar
   *   la empresa o no.
   */
  async getAllUsers(search?: string, activeCompanyId?: string | null) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.person', 'person')
      .where('user.rol != :superRole', { superRole: UserRole.SUPER_ADMIN });

    if (activeCompanyId) {
      query.andWhere('user.companyId = :companyId', {
        companyId: activeCompanyId,
      });
    }

    if (search && search.trim().length > 0) {
      const q = `%${search.trim().toLowerCase()}%`;
      query.andWhere(
        `(
          LOWER(user.userName) LIKE :q OR
          LOWER(user.mail) LIKE :q OR
          LOWER(person.firstName) LIKE :q OR
          LOWER(person.lastName) LIKE :q OR
          LOWER(person.businessName) LIKE :q OR
          LOWER(person.documentNumber) LIKE :q
        )`,
        { q },
      );
    }

    const users = await query.orderBy('user.userName', 'ASC').getMany();
    return users.map((user) => this.mapUser(user));
  }

  /**
   * Lista exclusivamente a los super-administradores del deploy.
   * No depende de empresa activa (son globales).
   */
  async listSuperAdmins(): Promise<ReturnType<UsersService['mapUser']>[]> {
    const users = await this.userRepository.find({
      where: { rol: UserRole.SUPER_ADMIN },
      relations: ['person'],
      order: { userName: 'ASC' },
    });
    return users.map((user) => this.mapUser(user));
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['person'],
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async createUser(
    data: {
      userName: string;
      mail: string;
      password: string;
      rol?: UserRole | string;
      companyId?: string | null;
      nonDeletable?: boolean;
      personId?: string;
      person?: {
        type?: PersonType | string;
        firstName: string;
        lastName?: string;
        businessName?: string;
        documentType?: DocumentType | string;
        documentNumber?: string;
        email?: string;
        phone?: string;
        address?: string;
      };
    },
    activeCompanyId?: string | null,
  ) {
    let person: Person | null = null;

    if (data.personId) {
      person = await this.personRepository.findOne({
        where: { id: data.personId },
      });
    } else if (data.person) {
      const createdPerson = this.personRepository.create({
        type: (data.person.type as PersonType) ?? PersonType.NATURAL,
        firstName: data.person.firstName,
        lastName: data.person.lastName ?? undefined,
        businessName: data.person.businessName ?? undefined,
        documentType: data.person.documentType as DocumentType,
        documentNumber: data.person.documentNumber ?? undefined,
        email: data.person.email ?? undefined,
        phone: data.person.phone ?? undefined,
        address: data.person.address ?? undefined,
      } as DeepPartial<Person>);
      person = await this.personRepository.save(createdPerson);
    }

    const rol = (data.rol as UserRole) ?? UserRole.OPERATOR;
    let companyId: string | null;
    if (rol === UserRole.SUPER_ADMIN) {
      companyId = null;
    } else {
      const resolved = data.companyId ?? activeCompanyId ?? null;
      if (!resolved) {
        throw new ForbiddenException(
          `Para crear un usuario ${rol} se requiere una empresa activa`,
        );
      }
      companyId = resolved;
    }

    const user = this.userRepository.create({
      userName: data.userName,
      mail: data.mail,
      pass: this.hashPassword(data.password),
      rol,
      companyId,
      nonDeletable: rol === UserRole.SUPER_ADMIN ? !!data.nonDeletable : false,
      person: person ?? undefined,
    } as DeepPartial<User>);

    const saved = await this.userRepository.save(user);
    const created = await this.getUserById(saved.id);

    return { success: true, user: created };
  }

  async updateUser(
    id: string,
    data: Partial<{
      userName: string;
      mail: string;
      rol: UserRole | string;
      phone?: string;
      personName?: string;
      personDni?: string;
    }>,
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['person'],
    });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    if (data.userName) {
      user.userName = data.userName;
    }
    if (data.mail) {
      user.mail = data.mail;
    }
    if (data.rol) {
      user.rol = data.rol as UserRole;
    }

    if (user.person) {
      if (data.phone !== undefined) {
        user.person.phone = data.phone || undefined;
      }
      if (data.personDni !== undefined) {
        user.person.documentNumber = data.personDni || undefined;
      }
      if (data.personName !== undefined) {
        const parsed = this.splitName(data.personName);
        user.person.firstName = parsed.firstName;
        user.person.lastName = parsed.lastName ?? undefined;
      }
      await this.personRepository.save(user.person);
    }

    await this.userRepository.save(user);
    const updated = await this.getUserById(id);

    if (!updated) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return { success: true, user: updated };
  }

  /**
   * Soft-delete con protecciones:
   * - No permite auto-eliminarse.
   * - No permite eliminar usuarios `nonDeletable` (el SUPER_ADMIN del seed).
   * - Solo un SUPER_ADMIN puede eliminar a otro SUPER_ADMIN.
   */
  async deleteUser(id: string, currentUser?: CurrentUserPayload | null) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    if (currentUser?.id === user.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }
    if (user.nonDeletable) {
      throw new ForbiddenException(
        'Este usuario es protegido y no puede eliminarse',
      );
    }
    if (
      user.rol === UserRole.SUPER_ADMIN &&
      currentUser?.rol !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Solo un super-administrador puede eliminar a otro super-administrador',
      );
    }

    const result = await this.userRepository.softDelete(id);
    if (!result.affected) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }
    return { success: true };
  }

  async changePassword(userId: string, password: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }
    user.pass = this.hashPassword(password);
    await this.userRepository.save(user);
    return { success: true };
  }

  async changeOwnPassword(payload: {
    currentUserId?: string;
    newPassword?: string;
  }) {
    if (!payload.currentUserId || !payload.newPassword) {
      return {
        success: false,
        message: 'Missing user or password',
        statusCode: 400,
      };
    }
    return this.changePassword(payload.currentUserId, payload.newPassword);
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      userName: user.userName,
      mail: user.mail,
      rol: user.rol,
      companyId: user.companyId ?? null,
      nonDeletable: !!user.nonDeletable,
      person: user.person
        ? {
            name: this.buildPersonName(user.person),
            firstName: user.person.firstName,
            lastName: user.person.lastName ?? undefined,
            email: user.person.email ?? undefined,
            dni: user.person.documentNumber ?? undefined,
            phone: user.person.phone ?? undefined,
          }
        : undefined,
    };
  }

  private buildPersonName(person: Person) {
    const parts = [person.firstName, person.lastName].filter(
      (value) => value && value.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' ').trim();
    }
    return person.businessName || person.firstName || 'Sin nombre';
  }

  private splitName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }
    const [firstName, ...rest] = trimmed.split(' ');
    return {
      firstName,
      lastName: rest.length > 0 ? rest.join(' ') : undefined,
    };
  }

  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, 12);
  }
}
