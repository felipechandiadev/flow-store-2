import React from 'react';
import * as Icons from 'lucide-react';

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

const variantClasses: Record<string, string> = {
	containedPrimary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
	containedSecondary: 'bg-secondary text-white hover:bg-secondary/90 active:bg-secondary/80',
	text: 'text-primary hover:bg-primary/10 active:bg-primary/20',
	basic: 'text-foreground hover:bg-foreground/10 active:bg-foreground/20',
	basicSecondary:
		'text-secondary hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors',
	outlined: 'border border-primary text-primary hover:bg-primary/10 active:bg-primary/20',
	ghost: 'hover:bg-foreground/5 active:bg-foreground/10',
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
				className={`${variantClasses[variant] || variantClasses['containedPrimary']} rounded transition-colors inline-flex items-center justify-center ${sizeClass} ${className}`}
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
			className={`${variantClasses[variant] || variantClasses['containedPrimary']} rounded transition-colors inline-flex items-center justify-center ${sizeClass} ${
				effectiveDisabled ? 'opacity-50 cursor-not-allowed' : ''
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
