import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DeepPartial, Repository } from 'typeorm';
import { Branch } from '../domain/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async getBranchById(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const branch = await this.branchRepository.findOne({ where });
    if (!branch) {
      return null;
    }

    return {
      id: branch.id,
      companyId: branch.companyId ?? null,
      name: branch.name,
      address: branch.address ?? null,
      phone: branch.phone ?? null,
      location: branch.location ?? null,
      isActive: branch.isActive,
      isHeadquarters: branch.isHeadquarters,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  async getAllBranches(companyId: string, includeInactive: boolean) {
    const query = this.branchRepository
      .createQueryBuilder('branch')
      .where('branch.companyId = :companyId', { companyId });

    if (!includeInactive) {
      query.andWhere('branch.isActive = :isActive', { isActive: true });
    }

    const branches = await query.orderBy('branch.name', 'ASC').getMany();

    return branches.map((branch) => ({
      id: branch.id,
      companyId: branch.companyId ?? null,
      name: branch.name,
      address: branch.address ?? null,
      phone: branch.phone ?? null,
      location: branch.location ?? null,
      isActive: branch.isActive,
      isHeadquarters: branch.isHeadquarters,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    }));
  }

  async updateBranch(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      address: string | null;
      phone: string | null;
      location: { lat: number; lng: number } | null;
      isActive: boolean;
      isHeadquarters: boolean;
    }>,
  ) {
    const branch = await this.branchRepository.findOne({
      where: { id, companyId },
    });
    if (!branch) {
      return null;
    }

    // If setting this branch as headquarters, remove headquarters flag from others (within same company)
    if (data.isHeadquarters === true) {
      await this.branchRepository.update(
        { isHeadquarters: true, companyId },
        { isHeadquarters: false },
      );
    }

    await this.branchRepository.update({ id, companyId }, data as any);
    return this.getBranchById(id, companyId);
  }

  async createBranch(data: {
    name: string;
    address?: string | null;
    phone?: string | null;
    companyId: string;
    location?: { lat: number; lng: number } | null;
    isActive?: boolean;
  }) {
    if (!data.name || !String(data.name).trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }
    if (!data.companyId || !isUUID(data.companyId)) {
      return { success: false, error: 'companyId requerido' };
    }
    const hasLocation =
      data.location != null &&
      typeof data.location.lat === 'number' &&
      !Number.isNaN(data.location.lat) &&
      typeof data.location.lng === 'number' &&
      !Number.isNaN(data.location.lng);
    const toSave: DeepPartial<Branch> = {
      name: String(data.name).trim(),
      companyId: data.companyId,
      address: data.address && String(data.address).trim() ? String(data.address).trim() : null,
      phone: data.phone && String(data.phone).trim() ? String(data.phone).trim() : null,
      location: hasLocation
        ? { lat: data.location!.lat, lng: data.location!.lng }
        : null,
      isActive: data.isActive !== false,
      isHeadquarters: false,
    } as DeepPartial<Branch>;
    const saved = await this.branchRepository.save(toSave);
    const out = await this.getBranchById(saved.id, data.companyId);
    if (!out) {
      return { success: false, error: 'No se pudo crear la sucursal' };
    }
    return { success: true, data: out };
  }

  async deleteBranch(
    id: string,
    companyId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const res = await this.branchRepository.softDelete({ id, companyId } as any);
    if (!res.affected) {
      return { success: false, error: 'Sucursal no encontrada' };
    }
    return { success: true };
  }
}
