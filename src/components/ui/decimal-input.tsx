import { useState } from 'react';
import { Input, type InputProps } from '@/components/ui/input';
import { decimalInput, parseDecimal } from '@/utils/formatters';

/**
 * Number field written the French way (« 82,5 »): a type="number" field swallowed the comma in the Android WebView
 * (82,5 → 825). Keeps what is being typed (« 82, ») and follows a value changed elsewhere.
 */
export function DecimalInput({ value, onValue, ...props }: Omit<InputProps, 'value' | 'onChange' | 'type'> & { value: number; onValue: (n: number) => void }) {
  const [text, setText] = useState(() => decimalInput(value));
  return (
    <Input
      inputMode="decimal"
      {...props}
      type="text"
      value={parseDecimal(text) === value ? text : decimalInput(value)}
      onChange={(e) => {
        const n = parseDecimal(e.target.value);
        if (n === null) return;
        setText(e.target.value);
        onValue(n);
      }}
    />
  );
}
