import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationalUnit,
  OrganizationalUnitType,
} from '../domain/organizational-unit.entity';
import { Company } from '../../companies/domain/company.entity';

@Injectable()
export class OrganizationalUnitsService {
  constructor(
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async getOrganizationalUnitById(id: string) {
    const unit = await this.organizationalUnitRepository.findOne({
      where: { id },
      relations: ['company', 'branch', 'resultCenter', 'parent'],
    });

    if (!unit) {
      return null;
    }

    return this.formatOrganizationalUnit(unit);
  }

  async getAllOrganizationalUnits(params?: {
    includeInactive?: boolean;
    unitType?: OrganizationalUnitType;
    branchId?: string;
    companyId?: string;
    resultCenterId?: string;
  }) {
    const query = this.organizationalUnitRepository.createQueryBuilder('ou');

    query.leftJoinAndSelect('ou.company', 'company');
    query.leftJoinAndSelect('ou.branch', 'branch');
    query.leftJoinAndSelect('ou.resultCenter', 'resultCenter');
    query.leftJoinAndSelect('ou.parent', 'parent');

    if (!params?.includeInactive) {
      query.andWhere('ou.isActive = :isActive', { isActive: true });
    }

    if (params?.unitType) {
      query.andWhere('ou.unitType = :unitType', { unitType: params.unitType });
    }

    if (params?.branchId) {
      query.andWhere('ou.branchId = :branchId', { branchId: params.branchId });
    }

    if (params?.companyId) {
      query.andWhere('ou.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    if (params?.resultCenterId) {
      query.andWhere('ou.resultCenterId = :resultCenterId', {
        resultCenterId: params.resultCenterId,
      });
    }

    const units = await query.orderBy('ou.code', 'ASC').getMany();

    return units.map((item) => this.formatOrganizationalUnit(item));
  }

  async createOrganizationalUnit(data: {
    companyId?: string;
    code?: string;
    name: string;
    description?: string | null;
    unitType?: OrganizationalUnitType | string;
    parentId?: string | null;
    branchId?: string | null;
    resultCenterId?: string | null;
    isActive?: boolean;
    metadata?: Record<string, unknown> | null;
  }) {
    let companyId = data.companyId;

    // If companyId not provided, get the first available company
    if (!companyId) {
      const firstCompany = await this.companyRepository.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });

      if (!firstCompany) {
        throw new Error('No company found. Please create a company first.');
      }

      companyId = firstCompany.id;
    }

    // If code not provided, auto-generate one
    let code = data.code;
    if (!code) {
      const prefix =
        data.name
          .substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '') || 'OU';
      const timestamp = Date.now().toString().slice(-6);
      code = `${prefix}-${timestamp}`;
    }

    const createData = {
      ...data,
      companyId,
      code,
      description: data.description ?? undefined,
      metadata: data.metadata ?? undefined,
      unitType:
        (data.unitType as OrganizationalUnitType) ??
        OrganizationalUnitType.OTHER,
    };

    const unit = this.organizationalUnitRepository.create(
      createData as Partial<OrganizationalUnit>,
    );
    await this.organizationalUnitRepository.save(unit);

    return this.getOrganizationalUnitById(unit.id);
  }

  async updateOrganizationalUnit(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      description?: string | null;
      unitType?: OrganizationalUnitType | string;
      parentId?: string | null;
      branchId?: string | null;
      resultCenterId?: string | null;
      isActive?: boolean;
      metadata?: Record<string, unknown> | null;
    }>,
  ) {
    const updateData = { ...data };
    if (updateData.unitType) {
      (updateData as any).unitType =
        updateData.unitType as OrganizationalUnitType;
    }
    if ('description' in updateData) {
      (updateData as any).description = updateData.description ?? undefined;
    }
    if ('metadata' in updateData) {
      (updateData as any).metadata = updateData.metadata ?? undefined;
    }

    await this.organizationalUnitRepository.update(id, updateData as any);
    return this.getOrganizationalUnitById(id);
  }

  async deleteOrganizationalUnit(id: string) {
    await this.organizationalUnitRepository.softDelete(id);
    return { success: true };
  }

  private formatOrganizationalUnit(unit: OrganizationalUnit) {
    return {
      id: unit.id,
      companyId: unit.companyId,
      code: unit.code,
      name: unit.name,
      description: unit.description ?? null,
      unitType: unit.unitType,
      parentId: unit.parentId ?? null,
      branchId: unit.branchId ?? null,
      resultCenterId: unit.resultCenterId ?? null,
      isActive: unit.isActive,
      metadata: unit.metadata ?? null,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      company: unit.company
        ? { id: unit.company.id, razonSocial: unit.company.razonSocial }
        : null,
      branch: unit.branch
        ? { id: unit.branch.id, name: unit.branch.name }
        : null,
      resultCenter: unit.resultCenter
        ? {
            id: unit.resultCenter.id,
            name: unit.resultCenter.name,
            code: unit.resultCenter.code,
          }
        : null,
      parent: unit.parent
        ? { id: unit.parent.id, name: unit.parent.name, code: unit.parent.code }
        : null,
    };
  }
}
