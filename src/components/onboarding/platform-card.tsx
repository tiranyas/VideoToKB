'use client';

import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';

interface PlatformCardProps {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onClick: () => void;
}

export function PlatformCard({ id, name, description, icon: Icon, selected, onClick }: PlatformCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border-2 transition-all hover:shadow-md text-left overflow-hidden ${
        selected
          ? 'border-violet-600 ring-2 ring-violet-100 bg-violet-50/30'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-full h-[100px] bg-gray-50 relative overflow-hidden rounded-t-[10px]">
        <Image
          src={`/platforms/${id}.svg`}
          alt={`${name} preview`}
          fill
          className="object-cover object-top"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="p-3 w-full">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${selected ? 'text-violet-600' : 'text-gray-400'}`} />
          <span className={`text-sm font-medium ${selected ? 'text-violet-700' : 'text-gray-900'}`}>
            {name}
          </span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
