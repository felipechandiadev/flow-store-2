import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../domain/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async getBranchById(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });
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

  async getAllBranches(includeInactive: boolean) {
    const query = this.branchRepository.createQueryBuilder('branch');

    if (!includeInactive) {
      query.where('branch.isActive = :isActive', { isActive: true });
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
    data: Partial<{
      name: string;
      address: string | null;
      phone: string | null;
      location: { lat: number; lng: number } | null;
      isActive: boolean;
      isHeadquarters: boolean;
    }>,
  ) {
    // Check if branch exists
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      return null;
    }

    // If setting this branch as headquarters, remove headquarters flag from others
    if (data.isHeadquarters === true) {
      await this.branchRepository.update(
        { isHeadquarters: true },
        { isHeadquarters: false },
      );
    }

    await this.branchRepository.update(id, data as any);
    return this.getBranchById(id);
  }
}
