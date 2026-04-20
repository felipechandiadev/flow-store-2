import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../domain/user.entity';
import {
  Person,
  DocumentType,
  PersonType,
} from '@modules/persons/domain/person.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}

  async getAllUsers(search?: string) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.person', 'person');

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

  async createUser(data: {
    userName: string;
    mail: string;
    password: string;
    rol?: UserRole | string;
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
  }) {
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

    const user = this.userRepository.create({
      userName: data.userName,
      mail: data.mail,
      pass: this.hashPassword(data.password),
      rol: (data.rol as UserRole) ?? UserRole.OPERATOR,
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

  async deleteUser(id: string) {
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
      person: user.person
        ? {
            name: this.buildPersonName(user.person),
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
