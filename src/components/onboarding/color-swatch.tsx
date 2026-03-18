'use client';

import { X } from 'lucide-react';

interface ColorSwatchProps {
  color: string;
  label?: string;
  selected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'md';
}

export function ColorSwatch({ color, label, selected, onClick, onDelete, size = 'md' }: ColorSwatchProps) {
  const dim = size === 'md' ? 'w-12 h-12' : 'w-8 h-8';

  return (
    <div className="flex flex-col items-center gap-1.5 group relative">
      <button
        type="button"
        onClick={onClick}
        className="relative"
        title={`${color} — click to assign`}
      >
        <div
          className={`${dim} rounded-full border-2 transition-all shadow-sm ${
            selected
              ? 'border-violet-600 ring-2 ring-violet-200 scale-110'
              : 'border-gray-200 hover:border-gray-400 hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
        />
        {/* Selection check */}
        {selected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>
      {/* Delete button on hover */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
          title="Remove color"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
      {/* Label */}
      {label && (
        <span className="text-[10px] text-violet-600 font-semibold uppercase tracking-wide">{label}</span>
      )}
      {/* Hex value */}
      <span className={`text-[10px] font-mono ${label ? 'text-gray-400' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
        {color.toUpperCase()}
      </span>
    </div>
  );
}
