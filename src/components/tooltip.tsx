'use client';

import type { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ text, children, position = 'top', className }: TooltipProps) {
  return (
    <span className={`relative group/tip inline-flex ${className ?? ''}`}>
      {children}
      <span
        className={`
          pointer-events-none absolute left-1/2 -translate-x-1/2 z-50
          rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white whitespace-nowrap shadow-lg
          opacity-0 group-hover/tip:opacity-100 transition-opacity duration-200 delay-700
          ${position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
        `}
      >
        {text}
        <span
          className={`
            absolute left-1/2 -translate-x-1/2 border-4 border-transparent
            ${position === 'top' ? 'top-full border-t-gray-900' : 'bottom-full border-b-gray-900'}
          `}
        />
      </span>
    </span>
  );
}
