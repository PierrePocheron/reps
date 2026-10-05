import { useState, useEffect, useCallback } from 'react';
import { getUserTemplates, createUserTemplate, deleteUserTemplate, updateUserTemplate } from '@/firebase/templates';
import { useUserStore } from '@/store/userStore';
import type { WorkoutTemplate } from '@/firebase/types';

export function useUserTemplates() {
  const uid = useUserStore().user?.uid;
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    const data = await getUserTemplates(uid);
    setTemplates(data);
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(
    async (data: Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt'>) => {
      if (!uid) return;
      const created = await createUserTemplate(uid, data);
      setTemplates((prev) => [created, ...prev]);
    },
    [uid]
  );

  const remove = useCallback(
    async (templateId: string) => {
      if (!uid) return;
      await deleteUserTemplate(uid, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    },
    [uid]
  );

  const update = useCallback(
    async (templateId: string, data: Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt'>) => {
      if (!uid) return;
      await updateUserTemplate(uid, templateId, data);
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, exerciseIds: undefined, muscuExercises: undefined, ...data } : t)));
    },
    [uid]
  );

  return { templates, loading, create, remove, update };
}
