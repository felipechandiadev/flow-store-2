import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Recipe } from '../domain/recipe.entity';
import { RecipeLine } from '../domain/recipe-line.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

const RECIPE_ALLOWED_PRODUCT_TYPES = new Set([
  'SERVICE',
  'MANUFACTURADO',
  'PREPARADO',
  'ELABORADO',
]);

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeLine)
    private readonly recipeLineRepo: Repository<RecipeLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  async list(outputVariantId?: string) {
    const qb = this.recipeRepo.createQueryBuilder('r').leftJoinAndSelect('r.lines', 'lines');
    if (outputVariantId) {
      qb.where('r.outputVariantId = :outputVariantId', { outputVariantId });
    }
    qb.orderBy('r.updatedAt', 'DESC');
    return qb.getMany();
  }

  async findById(id: string) {
    const recipe = await this.recipeRepo.findOne({ where: { id }, relations: ['lines'] });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    return recipe;
  }

  async create(dto: CreateRecipeDto) {
    const outputId = dto.outputVariantId?.trim();
    if (!outputId) {
      throw new BadRequestException('outputVariantId es obligatorio.');
    }
    const variant = await this.variantRepo.findOne({
      where: { id: outputId },
      relations: ['product'],
    });
    if (!variant?.product) {
      throw new BadRequestException(
        'Variante de salida no encontrada o sin producto asociado.',
      );
    }
    const pt = String(variant.product?.productType ?? 'PHYSICAL')
      .trim()
      .toUpperCase();
    if (!RECIPE_ALLOWED_PRODUCT_TYPES.has(pt)) {
      throw new BadRequestException(
        'Solo productos tipo servicio, manufacturado, preparado o elaborado pueden tener receta (BOM).',
      );
    }

    const recipe = this.recipeRepo.create({
      outputVariantId: dto.outputVariantId,
      type: dto.type,
      version: dto.version ?? 1,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    const saved = await this.recipeRepo.save(recipe);

    const lines = (dto.lines ?? []).map((l) =>
      this.recipeLineRepo.create({
        recipeId: saved.id,
        inputVariantId: l.inputVariantId,
        qtyPerOutputUnit: l.qtyPerOutputUnit,
        wasteFactor: l.wasteFactor ?? 0,
        sortOrder: l.sortOrder ?? 1,
      }),
    );
    if (lines.length) {
      await this.recipeLineRepo.save(lines);
    }

    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateRecipeDto) {
    const current = await this.findById(id);

    if (dto.outputVariantId != null) current.outputVariantId = dto.outputVariantId as any;
    if (dto.type != null) current.type = dto.type as any;
    if (dto.version != null) current.version = dto.version as any;
    if (dto.isActive != null) current.isActive = dto.isActive as any;
    if (dto.metadata != null) current.metadata = dto.metadata as any;

    await this.recipeRepo.save(current);

    if (dto.lines) {
      await this.recipeLineRepo.delete({ recipeId: id } as any);
      const lines = dto.lines.map((l) =>
        this.recipeLineRepo.create({
          recipeId: id,
          inputVariantId: (l as any).inputVariantId,
          qtyPerOutputUnit: Number((l as any).qtyPerOutputUnit ?? 0),
          wasteFactor: Number((l as any).wasteFactor ?? 0),
          sortOrder: Number((l as any).sortOrder ?? 1),
        }),
      );
      await this.recipeLineRepo.save(lines);
    }

    return this.findById(id);
  }
}

