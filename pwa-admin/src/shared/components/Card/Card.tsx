/**
 * Simple Card Component
 * Reusable container with rounded borders and shadows
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg bg-white border border-neutral-200 ${className}`}
    >
      {children}
    </div>
  );
}
