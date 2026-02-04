import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Check } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

// Predefined color palette with vibrant, distinct colors
const PREDEFINED_COLORS = [
  // Primary colors
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  // Secondary colors
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  // Neutral colors
  '#64748B', // Slate
  '#6B7280', // Gray
  '#78716C', // Stone
  '#71717A', // Zinc
  // Dark colors
  '#1E3A5F', // Navy
  '#312E81', // Indigo Dark
  '#701A75', // Purple Dark
  '#881337', // Rose Dark
  '#7C2D12', // Orange Dark
  '#14532D', // Green Dark
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || '#3B82F6');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {/* Color display button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
          style={{ backgroundColor: value || '#3B82F6' }}
        />
        <span className="text-sm text-gray-700 flex-1 text-left">
          {t('common.selectColor') || 'Selecionar cor'}
        </span>
        <Palette className="h-4 w-4 text-gray-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          {/* Predefined colors grid */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {PREDEFINED_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  value === color ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-300' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              >
                {value === color && (
                  <Check className="w-4 h-4 text-white mx-auto drop-shadow-md" />
                )}
              </button>
            ))}
          </div>

          {/* Custom color picker */}
          <div className="border-t border-gray-200 pt-3">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              {t('common.customColor') || 'Cor personalizada'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300 p-0.5"
              />
              <input
                type="text"
                value={customColor.toUpperCase()}
                onChange={(e) => {
                  const color = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(color)) {
                    setCustomColor(color);
                    if (color.length === 7) {
                      onChange(color);
                    }
                  }
                }}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md uppercase"
                placeholder="#3B82F6"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
