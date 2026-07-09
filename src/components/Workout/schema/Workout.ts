import { co, z } from "jazz-tools";

// ─── JAZZ SCHEMA ─────────────────────────────────────────────────────────────
// Synced workout state. Mirrors the data that used to live in localStorage:
//   completed:    map of exerciseId -> number of completed sets
//   weekHistory:  timestamps of completed weeks
//   activeDay:    currently selected day within the routine

export const CompletedSets = co.record(z.string(), z.number());
export const WeekHistory = co.list(z.number());

export const RoutineState = co.map({
  activeDay: z.number(),
  completed: CompletedSets,
  weekHistory: WeekHistory,
});

// Keyed by routine id ("a" | "b" | "c").
export const RoutineStates = co.record(z.string(), RoutineState);

export const WorkoutRoot = co.map({
  activeRoutineId: z.string(),
  routines: RoutineStates,
});

export const WorkoutAccount = co
  .account({
    profile: co.profile(),
    root: WorkoutRoot,
  })
  .withMigration((account) => {
    if (!account.$jazz.has("root")) {
      account.$jazz.set(
        "root",
        WorkoutRoot.create({
          activeRoutineId: "d",
          routines: RoutineStates.create({}),
        }),
      );
    }
  });

// ─── LOCALSTORAGE MIGRATION ──────────────────────────────────────────────────
// The tracker previously persisted per-routine state under `workout-<id>-*`
// keys (with un-namespaced fallbacks for the original routine "a"). When a
// routine has no synced state yet, we seed it from those keys.

export type RoutineSeed = {
  activeDay: number;
  completed: Record<string, number>;
  weekHistory: number[];
};

export function createRoutineState(seed: RoutineSeed) {
  return RoutineState.create({
    activeDay: seed.activeDay,
    completed: CompletedSets.create(seed.completed),
    weekHistory: WeekHistory.create(seed.weekHistory),
  });
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function legacyRoutineId(): string | null {
  return safeGet("workout-routine");
}

export function loadLegacyRoutine(rid: string): RoutineSeed {
  // Routine "a" predates the per-routine namespace, so fall back to the
  // original un-namespaced keys.
  const oldKey = (suffix: string) =>
    rid === "a" ? safeGet(`workout-${suffix}`) : null;

  const completedRaw =
    safeGet(`workout-${rid}-completed`) ?? oldKey("completed");
  const activeDayRaw =
    safeGet(`workout-${rid}-active-day`) ?? oldKey("active-day");
  const weekHistoryRaw =
    safeGet(`workout-${rid}-week-history`) ?? oldKey("week-history");

  return {
    activeDay: activeDayRaw ? Number(activeDayRaw) || 0 : 0,
    completed: parseJSON<Record<string, number>>(completedRaw, {}),
    weekHistory: parseJSON<number[]>(weekHistoryRaw, []),
  };
}
