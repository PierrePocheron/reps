import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatar } from '../UserAvatar';

describe('UserAvatar Component', () => {
    it('should render fallback emoji if no user or emoji provided', () => {
        render(<UserAvatar />);
        expect(screen.getByText('🐥')).toBeInTheDocument();
    });

    it('should render prop emoji if provided', () => {
        render(<UserAvatar emoji="🔥" />);
        expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('should prefer prop emoji over user emoji', () => {
        const user = { avatarEmoji: '👤' };
        render(<UserAvatar user={user as any} emoji="🤖" />);
        expect(screen.getByText('🤖')).toBeInTheDocument();
        expect(screen.queryByText('👤')).not.toBeInTheDocument();
    });

    it('should render user emoji if provided', () => {
        const user = { avatarEmoji: '👤' };
        render(<UserAvatar user={user as any} />);
        expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('should apply size classes', () => {
        const { container } = render(<UserAvatar size="xl" />);
        expect(container.firstChild).toHaveClass('w-16 h-16 text-3xl');
    });
});
