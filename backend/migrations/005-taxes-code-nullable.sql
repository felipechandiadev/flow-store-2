-- Migration: Make taxes.code optional (nullable)
-- Date: 2026-04-24
-- Description: Impuestos se identifican por UUID; código corto es opcional.
-- Dialect: PostgreSQL (DB_TYPE=postgres en backend/.env.example)

ALTER TABLE taxes ALTER COLUMN code DROP NOT NULL;
