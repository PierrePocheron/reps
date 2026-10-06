import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FriendTemplatesDialog } from '../FriendTemplatesDialog';
import { useUserStore } from '@/store/userStore';
import { createUserTemplate, getUserTemplates } from '@/firebase/templates';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/firebase/templates', () => ({ createUserTemplate: vi.fn(), getUserTemplates: vi.fn() }));

describe('FriendTemplatesDialog', () => {
  it('a double tap on « Copier » copies the template once', async () => {
    useUserStore.setState({ user: { uid: 'me' } as never });
    vi.mocked(getUserTemplates).mockResolvedValue([{ id: 't1', name: 'Push', description: '', emoji: '💪', workoutType: 'musculation', muscuExercises: [] }]);
    vi.mocked(createUserTemplate).mockReturnValue(new Promise(() => {})); // slow network / offline: still copying
    render(<FriendTemplatesDialog friend={{ uid: 'alice', displayName: 'Alice' } as never} onClose={() => {}} />);
    const copy = await screen.findByRole('button', { name: 'Copier Push' });
    fireEvent.click(copy);
    fireEvent.click(copy);
    expect(createUserTemplate).toHaveBeenCalledTimes(1);
  });
});
