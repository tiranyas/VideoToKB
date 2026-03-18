'use client';

interface ColorSwatchProps {
  color: string;
  label?: string;
  selected: boolean;
  onClick: () => void;
}

export function ColorSwatch({ color, label, selected, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
      title={color}
    >
      <div
        className={`w-8 h-8 rounded-full border-2 transition-all ${
          selected
            ? 'border-violet-600 ring-2 ring-violet-200 scale-110'
            : 'border-gray-200 hover:border-gray-400'
        }`}
        style={{ backgroundColor: color }}
      />
      {label && (
        <span className="text-[10px] text-violet-600 font-medium">{label}</span>
      )}
      {!label && selected && (
        <span className="text-[10px] text-gray-400">{color}</span>
      )}
    </button>
  );
}
