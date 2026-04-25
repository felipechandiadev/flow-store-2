/**
 * Contenedor de tarjeta. Estilos en `./cards.css` (tokens `var(--color-*)` del tema; no reglas en globals.css).
 *
 * Modo compuesto: `media`, `title`, `subtitle`, `content` / `children`, `actions` (con callbacks);
 * modo legado: solo `children` con padding.
 *
 * En `actions`, `IconButton` se fuerza a `variant="basicSecondary"` (norma de diseño).
 */

import React from 'react';
import * as Lucide from 'lucide-react';
import { Button, type ButtonVariant } from '../Button/Button';
import IconButton from '../IconButton/IconButton';

import './cards.css';

export type LucideIconName = keyof typeof Lucide;

export type CardTextAction = {
  id?: string;
  label: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  'data-test-id'?: string;
};

/** Acción con icono: siempre `IconButton` con `variant="basicSecondary"` y `size="sm"`. */
export type CardIconAction = {
  id?: string;
  icon: LucideIconName;
  ariaLabel: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  'data-test-id'?: string;
};

export type CardAction = CardTextAction | CardIconAction;

export type CardProps = {
  className?: string;
  onClick?: () => void;
  'data-test-id'?: string;
  /** Zona media / cabecera visual (ancho completo, arriba) */
  media?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Banda derecha de la cabecera (p. ej. chip, badge) */
  headerEnd?: React.ReactNode;
  /** Cuerpo; si se omite y hay modo compuesto, se usa `children` */
  content?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * Pie: botones con texto o acciones con icono (`icon` + `ariaLabel`).
   * Los iconos usan `IconButton` fijo a `basicSecondary` (ver instrucciones webadmin).
   */
  actions?: CardAction[];
};

function useStructured(p: CardProps) {
  return (
    p.media != null ||
    p.title != null ||
    p.subtitle != null ||
    p.headerEnd != null ||
    p.content !== undefined ||
    (Array.isArray(p.actions) && p.actions.length > 0)
  );
}

function isIconAction(a: CardAction): a is CardIconAction {
  return 'icon' in a;
}

function cardRootClass(structured: boolean, onClick?: () => void, extra?: string) {
  return [
    'fs-card',
    !structured ? 'fs-card--legacy' : '',
    onClick ? 'fs-card--clickable' : '',
    extra?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Card({
  className = '',
  onClick,
  'data-test-id': dataTestId,
  media,
  title,
  subtitle,
  headerEnd,
  content,
  children,
  actions,
}: CardProps) {
  const structured = useStructured({
    className,
    onClick,
    'data-test-id': dataTestId,
    media,
    title,
    subtitle,
    headerEnd,
    content,
    children,
    actions,
  });

  if (!structured) {
    return (
      <div
        onClick={onClick}
        data-test-id={dataTestId}
        className={cardRootClass(false, onClick, className)}
      >
        {children}
      </div>
    );
  }

  const body = content !== undefined ? content : children;
  const hasHeader = title != null || subtitle != null || headerEnd != null;
  const hasActions = Array.isArray(actions) && actions.length > 0;

  return (
    <div onClick={onClick} data-test-id={dataTestId} className={cardRootClass(true, onClick, className)}>
      {media != null ? (
        <div className="w-full" data-test-id="card-media">
          {media}
        </div>
      ) : null}

      {hasHeader ? (
        <div
          className={`fs-card__header ${
            headerEnd != null && (title != null || subtitle != null)
              ? 'flex items-start justify-between gap-3'
              : headerEnd != null
                ? 'flex justify-end'
                : ''
          }`}
          data-test-id="card-header"
        >
          {title != null || subtitle != null ? (
            <div className="fs-card__header-text">
              {title != null ? <h3 className="fs-card__title">{title}</h3> : null}
              {subtitle != null ? <p className="fs-card__subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {headerEnd != null ? <div className="fs-card__header-end">{headerEnd}</div> : null}
        </div>
      ) : null}

      {body != null ? (
        <div className="fs-card__content" data-test-id="card-content">
          {body}
        </div>
      ) : null}

      {hasActions ? (
        <div className="fs-card__actions" data-test-id="card-actions">
          {actions!.map((a, i) => {
            if (isIconAction(a)) {
              return (
                <IconButton
                  key={a.id ?? `card-action-icon-${i}`}
                  icon={a.icon}
                  variant="basicSecondary"
                  size="sm"
                  ariaLabel={a.ariaLabel}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  data-test-id={a['data-test-id']}
                />
              );
            }
            return (
              <Button
                key={a.id ?? `card-action-${i}`}
                type={a.type ?? 'button'}
                variant={a.variant ?? 'outlined'}
                size="md"
                disabled={a.disabled}
                onClick={a.onClick}
                data-test-id={a['data-test-id']}
              >
                {a.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
