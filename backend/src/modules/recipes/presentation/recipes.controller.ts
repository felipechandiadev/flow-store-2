import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RecipesService } from '../application/recipes.service';
import { CreateRecipeDto } from '../application/dto/create-recipe.dto';
import { UpdateRecipeDto } from '../application/dto/update-recipe.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async list(@Query('outputVariantId') outputVariantId?: string) {
    return this.recipesService.list(outputVariantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.recipesService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(id, dto);
  }
}

