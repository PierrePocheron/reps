import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('App Smoke Test', () => {
    it('true should be true', () => {
        expect(true).toBe(true);
    });

    it('LoadingSpinner renders correctly', () => {
        render(<LoadingSpinner />);
        // Spinner usually has a class or some indicator.
        // Based on the code seen earlier, it's a lucide icon or a div.
        // We'll just check if it doesn't crash.
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });
});
