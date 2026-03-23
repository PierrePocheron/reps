import { useState, useEffect, useCallback } from 'react';
import { getUserTemplates, createUserTemplate, deleteUserTemplate } from '@/firebase/templates';
import { useUserStore } from '@/store/userStore';
import type { WorkoutTemplate } from '@/firebase/types';

export function useUserTemplates() {
  const { user } = useUserStore();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const data = await getUserTemplates(user.uid);
    setTemplates(data);
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(
    async (data: Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt'>) => {
      if (!user) return;
      const created = await createUserTemplate(user.uid, data);
      setTemplates((prev) => [created, ...prev]);
    },
    [user?.uid]
  );

  const remove = useCallback(
    async (templateId: string) => {
      if (!user) return;
      await deleteUserTemplate(user.uid, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    },
    [user?.uid]
  );

  return { templates, loading, create, remove };
}
