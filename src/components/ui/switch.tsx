import { cn } from '@/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name: the setting this switch controls */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** On/off switch (platform convention for settings); 44 px touch target around a 44×24 track. */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn('group h-11 w-14 shrink-0 flex items-center justify-center rounded-full disabled:opacity-50 focus-visible:outline-none', className)}
    >
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 ring-offset-background',
          checked ? 'bg-primary' : 'bg-muted-foreground', // off track keeps 3:1 against the card (WCAG 1.4.11)
        )}
      >
        <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform', checked && 'translate-x-5')} />
      </span>
    </button>
  );
}
