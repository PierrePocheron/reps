import type { SetType } from '@/firebase/types';

// Types de série (Hevy : W / D / F) ; toucher l'étiquette fait défiler normale → échauffement → dégressive → échec
export const SET_TYPE_META: Record<SetType, { short: string; label: string; cls: string }> = {
  warmup: { short: 'É', label: 'échauffement', cls: 'text-amber-700 dark:text-amber-400' },
  drop: { short: 'D', label: 'dégressive', cls: 'text-sky-700 dark:text-sky-400' },
  failure: { short: '!', label: "jusqu'à l'échec", cls: 'text-red-600 dark:text-red-400' },
};
const SET_TYPE_CYCLE: (SetType | undefined)[] = [undefined, 'warmup', 'drop', 'failure'];
export const nextSetType = (t: SetType | undefined) => SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(t) + 1) % SET_TYPE_CYCLE.length];
