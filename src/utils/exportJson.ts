import type { GymSession, Session, User, WorkoutTemplate } from '@/firebase/types';
import type { BodyEntry } from '@/utils/body';
import { isTimed } from '@/utils/records';

interface ExportInput {
  user: User | null;
  sessions: Session[];
  gymSessions: GymSession[];
  body: BodyEntry[];
  templates: WorkoutTemplate[];
  now?: Date;
}

/**
 * « Toutes tes données » (right to data portability): profile, renfo and gym sessions in full detail, body
 * measurements and personal templates. Internal fields (email hash, search name, notification flags) are left out.
 */
export function buildJsonExport({ user, sessions, gymSessions, body, templates, now = new Date() }: ExportInput) {
  return {
    exportedAt: now.toISOString(),
    user: user && {
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      birthDate: user.birthDate,
      weight: user.weight,
      height: user.height,
      gender: user.gender,
      totalReps: user.totalReps,
      totalSessions: user.totalSessions,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      badges: user.badges,
      createdAt: user.createdAt,
    },
    sessions: sessions.map((s) => ({
      date: s.date.toDate().toISOString(),
      duration: s.duration,
      totalReps: s.totalReps,
      totalCalories: s.totalCalories,
      exercises: s.exercises,
    })),
    gymSessions: gymSessions.map((s) => ({
      date: s.date.toDate().toISOString(),
      duration: s.duration,
      ...(s.title ? { title: s.title } : {}),
      ...(s.note ? { note: s.note } : {}),
      totalVolume: s.totalVolume,
      totalSets: s.totalSets,
      exercises: s.exercises.map((ex) => ({
        name: ex.name,
        ...(ex.note ? { note: ex.note } : {}),
        ...(ex.supersetId ? { supersetId: ex.supersetId } : {}),
        // validated sets only, with what was actually done
        sets: ex.sets.filter((set) => set.completed).map((set) => {
          const reps = set.actualReps ?? set.reps;
          return {
            weight: set.actualWeight ?? set.weight, // timed sets too: a weighted plank keeps its load
            ...(isTimed(ex) ? { seconds: reps } : { reps }),
            ...(set.type ? { type: set.type } : {}),
            ...(set.rpe ? { rpe: set.rpe } : {}),
            ...(set.isRecord ? { isRecord: true } : {}),
          };
        }),
      })),
    })),
    bodyMeasurements: body,
    templates: templates.map(({ name, emoji, description, workoutType, exerciseIds, muscuExercises }) => ({
      name, emoji, description, workoutType,
      ...(exerciseIds ? { exerciseIds } : {}),
      ...(muscuExercises ? { muscuExercises } : {}),
    })),
  };
}
