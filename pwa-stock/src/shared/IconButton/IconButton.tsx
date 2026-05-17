"use client";

import React from 'react';
import * as Icons from 'lucide-react';
import './icon-button.css';

type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
type LucideIconName = keyof typeof Icons;

interface IconButtonProps {
	icon: LucideIconName;
	variant?: 'containedPrimary' | 'containedSecondary' | 'text' | 'basic' | 'basicSecondary' | 'outlined' | 'ghost';
	size?: IconButtonSize;
	/** Grosor del trazo del icono Lucide (por defecto 2). Valores mayores = icono más “fuerte”. */
	strokeWidth?: number;
	disabled?: boolean;
	isLoading?: boolean;
	className?: string;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	ariaLabel?: string;
	[key: string]: any;
}

const variantClassNames: Record<NonNullable<IconButtonProps['variant']>, string> = {
	containedPrimary: 'fs-icon-button fs-icon-button--contained-primary',
	containedSecondary: 'fs-icon-button fs-icon-button--contained-secondary',
	text: 'fs-icon-button fs-icon-button--text',
	basic: 'fs-icon-button fs-icon-button--basic',
	basicSecondary: 'fs-icon-button fs-icon-button--basic-secondary',
	outlined: 'fs-icon-button fs-icon-button--outlined',
	ghost: 'fs-icon-button fs-icon-button--ghost',
};

const sizeMap: Record<Exclude<IconButtonSize, number>, string> = {
	xs: 'w-5 h-5',
	sm: 'w-7 h-7',
	md: 'w-10 h-10',
	lg: 'w-12 h-12',
	xl: 'w-14 h-14',
};

const iconSizeMap: Record<Exclude<IconButtonSize, number>, number> = {
	xs: 16,
	sm: 18,
	md: 24,
	lg: 28,
	xl: 32,
};

const IconButton: React.FC<IconButtonProps> = ({
	icon,
	variant = 'containedPrimary',
	size = 'md',
	strokeWidth = 2,
	disabled = false,
	isLoading = false,
	className = '',
	onClick,
	ariaLabel,
	...props
}) => {
	const sizeClass = typeof size === 'number' ? '' : sizeMap[size] || sizeMap['md'];
	const iconSize = typeof size === 'number' ? size : iconSizeMap[size] || 24;
	const effectiveDisabled = disabled || isLoading;

	// Get the icon component
	const IconComponent = Icons[icon] as React.ComponentType<any>;

	if (!IconComponent) {
		console.warn(`Icon "${icon}" not found in lucide-react`);
		return (
			<button
				type="button"
				className={`${variantClassNames[variant] ?? variantClassNames.containedPrimary} inline-flex items-center justify-center ${sizeClass} ${
					effectiveDisabled ? 'opacity-50' : ''
				} ${className}`}
				data-test-id="icon-button-root"
				onClick={onClick}
				aria-label={ariaLabel}
				disabled={effectiveDisabled}
				{...props}
			>
				<span className="text-lg">?</span>
			</button>
		);
	}

	return (
		<button
			type="button"
			className={`${variantClassNames[variant] ?? variantClassNames.containedPrimary} inline-flex items-center justify-center ${sizeClass} ${
				effectiveDisabled ? 'opacity-50' : ''
			} ${className}`}
			data-test-id="icon-button-root"
			onClick={onClick}
			aria-label={ariaLabel}
			disabled={effectiveDisabled}
			{...props}
		>
			<IconComponent
				size={iconSize}
				strokeWidth={strokeWidth}
				className={`select-none ${isLoading ? 'animate-spin' : ''}`}
				aria-hidden
			/>
		</button>
	);
};

export default IconButton;
