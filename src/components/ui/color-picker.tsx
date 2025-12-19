import { cn } from '@/utils/cn';
import { themeColors, type ThemeColor } from '@/utils/theme-colors';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: ThemeColor;
  onColorChange: (color: ThemeColor) => void;
  className?: string;
}

/**
 * Composant pour sélectionner une couleur de thème
 * Affiche toutes les couleurs disponibles avec leurs emojis
 */
export function ColorPicker({ selectedColor, onColorChange, className }: ColorPickerProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {(Object.keys(themeColors) as ThemeColor[]).map((color) => {
        const themeColor = themeColors[color];
        const isSelected = selectedColor === color;

        return (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-2 transition-all hover:scale-105',
              isSelected ? 'shadow-md' : 'border-border bg-card'
            )}
            style={{
              borderColor: isSelected ? `hsl(${themeColor.hsl})` : undefined,
              backgroundColor: isSelected ? `hsl(${themeColor.hsl} / 0.1)` : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = `hsl(${themeColor.hsl} / 0.5)`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '';
              }
            }}
          >
            <span className="text-2xl">{themeColor.emoji}</span>
            <span className="text-[10px] font-medium truncate w-full text-center">{themeColor.name}</span>
            {isSelected && (
              <div
                className="absolute right-2 top-2 rounded-full p-1"
                style={{ backgroundColor: `hsl(${themeColor.hsl})` }}
              >
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

