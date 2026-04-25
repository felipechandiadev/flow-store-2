import React from 'react';
import { Card } from './Card';

export type StatisticsValueTone = 'primary' | 'success' | 'info' | 'warning';

const valueToneClass: Record<StatisticsValueTone, string> = {
  primary: 'fs-statistics-card__value--primary',
  success: 'fs-statistics-card__value--success',
  info: 'fs-statistics-card__value--info',
  warning: 'fs-statistics-card__value--warning',
};

export interface StatisticsCardProps {
  /** Texto de la métrica (ej. «Total de usuarios») */
  label: string;
  /** Valor destacado (número, porcentaje, moneda) */
  value: React.ReactNode;
  /** Línea secundaria (ej. variación o período) */
  hint?: string;
  /** Color del valor; por defecto `primary` (tema: --color-*) */
  tone?: StatisticsValueTone;
  className?: string;
  onClick?: () => void;
  'data-test-id'?: string;
}

/**
 * Tarjeta de métrica: etiqueta, valor, hint. Colores vía tokens en `cards.css` (`--color-primary`, `success`, etc.).
 */
export function StatisticsCard({
  label,
  value,
  hint,
  tone = 'primary',
  className = '',
  onClick,
  'data-test-id': dataTestId,
}: StatisticsCardProps) {
  return (
    <Card className={className} onClick={onClick} data-test-id={dataTestId}>
      <p className="fs-statistics-card__label">{label}</p>
      <p className={`fs-statistics-card__value ${valueToneClass[tone]}`}>{value}</p>
      {hint ? <p className="fs-statistics-card__hint">{hint}</p> : null}
    </Card>
  );
}
