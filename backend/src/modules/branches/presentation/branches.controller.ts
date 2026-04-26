import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { BranchesService } from '../application/branches.service';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async getBranches(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.branchesService.getAllBranches(include);
  }

  @Post()
  async createBranch(
    @Body()
    data: {
      name: string;
      address?: string | null;
      phone?: string | null;
      companyId?: string | null;
      location?: { lat: number; lng: number } | null;
      isActive?: boolean;
    },
  ) {
    return this.branchesService.createBranch(data);
  }

  @Put(':id')
  async updateBranch(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      address: string | null;
      phone: string | null;
      location: { lat: number; lng: number } | null;
      isActive: boolean;
      isHeadquarters: boolean;
    }>,
  ) {
    const updated = await this.branchesService.updateBranch(id, data);
    if (!updated) {
      return { success: false, error: 'Sucursal no encontrada' };
    }
    return { success: true, data: updated };
  }

  @Delete(':id')
  async deleteBranch(@Param('id') id: string) {
    return this.branchesService.deleteBranch(id);
  }
}
