import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../ui/switch';

describe('Switch', () => {
  it('exposes its state and the setting it controls', () => {
    render(<Switch checked label="Feedback haptique" onCheckedChange={() => {}} />);
    const sw = screen.getByRole('switch', { name: 'Feedback haptique' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('asks for the opposite state on click', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} label="Effets sonores" onCheckedChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Effets sonores' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does nothing while disabled', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} disabled label="Rappels" onCheckedChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Rappels' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
