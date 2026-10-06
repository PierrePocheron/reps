import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlateCalculator } from '../PlateCalculator';

describe('PlateCalculator', () => {
  it('reads a target typed with the French comma (« 82,5 kg »)', () => {
    render(<PlateCalculator open onOpenChange={() => {}} weight={60} exerciseName="Squat barre" />);
    fireEvent.change(screen.getByLabelText(/Charge visée/), { target: { value: '82,5' } });
    expect(screen.getByLabelText(/Charge visée/)).toHaveValue('82,5');
    expect(screen.queryByText(/≠|pas exactement|impossible/i)).not.toBeInTheDocument();
  });
});
