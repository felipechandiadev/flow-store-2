import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './domain/recipe.entity';
import { RecipeLine } from './domain/recipe-line.entity';
import { RecipesService } from './application/recipes.service';
import { RecipesController } from './presentation/recipes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeLine])],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}

