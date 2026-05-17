'use client';

import React, { type KeyboardEvent } from 'react';

export type SwitchOptionLabels = {
  /** Opción cuando `checked` es false */
  off: string;
  /** Opción cuando `checked` es true */
  on: string;
};

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Etiqueta única (izquierda o derecha del control) */
  label?: string;
  labelPosition?: 'left' | 'right';
  /** Dos etiquetas (off | switch | on); la activa resalta según `checked` */
  optionLabels?: SwitchOptionLabels;
  disabled?: boolean;
  className?: string;
  ['data-test-id']?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  label,
  labelPosition = 'left',
  optionLabels,
  disabled = false,
  className = '',
  ...props
}) => {
  const setChecked = (next: boolean) => {
    if (disabled || next === checked) {
      return;
    }
    onChange?.(next);
  };

  const toggle = () => setChecked(!checked);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };

  const labelBase = 'text-sm font-medium leading-normal';
  /** Gris medio (--color-muted), más suave que foreground */
  const labelMuted = 'text-muted';
  const optionClass = (active: boolean) =>
    `${labelBase} transition-colors ${disabled ? 'opacity-50' : ''} ${
      active ? 'text-foreground' : labelMuted
    } ${disabled ? '' : 'cursor-pointer'}`;

  const thumbPrimary = Boolean(optionLabels);
  const thumbStyle: React.CSSProperties = disabled
    ? {
        borderColor: 'var(--color-border)',
        borderWidth: '1px',
        backgroundColor: 'var(--color-neutral)',
      }
    : thumbPrimary
      ? {
          borderColor: 'var(--color-primary)',
          borderWidth: '1px',
          backgroundColor: 'var(--color-primary)',
        }
      : checked
        ? {
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            backgroundColor: 'var(--color-primary)',
          }
        : { borderColor: 'var(--color-secondary)', borderWidth: '1px' };

  const track = (
    <span
      className={`relative flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 group ${disabled ? 'pointer-events-none' : ''}`}
      style={{
        boxShadow: 'inset 0 0 0 4px color-mix(in srgb, var(--color-border) 70%, transparent)',
        background: 'var(--color-background)',
      }}
      onClick={toggle}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <span
        className={`absolute left-1 top-1 h-4 w-4 rounded-full border transition-transform duration-200 ${
          disabled ? 'bg-neutral' : thumbPrimary ? '' : 'bg-background group-hover:bg-accent/60'
        }${checked ? ' translate-x-4' : ''}`}
        style={thumbStyle}
      />
    </span>
  );

  if (optionLabels) {
    return (
      <div
        className={`flex items-center justify-between gap-3 ${disabled ? 'cursor-not-allowed' : ''} ${className}`.trim()}
        data-test-id={props['data-test-id'] || 'switch-dual-root'}
        role="group"
        aria-label={`${optionLabels.off} o ${optionLabels.on}`}
      >
        <button
          type="button"
          disabled={disabled}
          className={`border-0 bg-transparent p-0 ${optionClass(!checked)}`}
          onClick={() => setChecked(false)}
          aria-pressed={!checked}
        >
          {optionLabels.off}
        </button>
        {track}
        <button
          type="button"
          disabled={disabled}
          className={`border-0 bg-transparent p-0 ${optionClass(checked)}`}
          onClick={() => setChecked(true)}
          aria-pressed={checked}
        >
          {optionLabels.on}
        </button>
      </div>
    );
  }

  return (
    <label
      className={`mt-1 flex select-none items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`.trim()}
      data-test-id={props['data-test-id'] || 'switch-root'}
    >
      {labelPosition === 'left' && label ? (
        <span className={`${labelBase} ${labelMuted} ${disabled ? 'opacity-50' : ''}`}>{label}</span>
      ) : null}
      {track}
      {labelPosition === 'right' && label ? (
        <span className={`${labelBase} ${labelMuted} ${disabled ? 'opacity-50' : ''}`}>{label}</span>
      ) : null}
    </label>
  );
};

export default Switch;
