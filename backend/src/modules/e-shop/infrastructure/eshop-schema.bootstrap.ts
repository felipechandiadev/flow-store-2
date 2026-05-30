import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Crea tablas/columnas eShop cuando no se ha corrido la migración (dev local).
 */
@Injectable()
export class EShopSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(EShopSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "e_shop_testimonials" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "company_id" uuid NOT NULL,
          "client_name" character varying(120) NOT NULL,
          "rating" smallint NOT NULL,
          "message" text NOT NULL,
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" integer NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_e_shop_testimonials" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_testimonials_company_id"
        ON "e_shop_testimonials" ("company_id");
      `);
      await this.dataSource.query(`
        ALTER TABLE "product_variants"
        ADD COLUMN IF NOT EXISTS "visible_in_e_shop" boolean NOT NULL DEFAULT false;
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "e_shop_hero_slides" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "company_id" uuid NOT NULL,
          "title" character varying(200),
          "subtitle" text,
          "cta_label" character varying(80),
          "cta_href" character varying(500),
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" integer NOT NULL DEFAULT 0,
          "text_align" character varying(10) NOT NULL DEFAULT 'left',
          "overlay_opacity" smallint NOT NULL DEFAULT 45,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_e_shop_hero_slides" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_hero_slides_company_id"
        ON "e_shop_hero_slides" ("company_id");
      `);
      await this.dataSource.query(`
        ALTER TABLE "e_shop_hero_slides"
        ADD COLUMN IF NOT EXISTS "cta_style" character varying(10) NOT NULL DEFAULT 'none';
      `);
      await this.dataSource.query(`
        ALTER TABLE "e_shop_hero_slides"
        ADD COLUMN IF NOT EXISTS "text_color" character varying(7);
      `);
      this.logger.log('eShop schema bootstrap OK');
    } catch (err) {
      this.logger.error(
        `eShop schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
