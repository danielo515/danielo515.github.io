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

// ─── FREE TRAIN ──────────────────────────────────────────────────────────────
// Improvised session with no predefined routine: exercises are added on the
// fly, each with its own rest and an open-ended set count. Finishing the
// session archives a summary into `history` and clears the exercise list.

export const FreeExercise = co.map({
  name: z.string(),
  // Rest between sets in seconds; what the rest timer starts with on +1.
  rest: z.number(),
  sets: z.number(),
});
export const FreeExercises = co.list(FreeExercise);

export const FreeSessionLog = z.object({
  finishedAt: z.number(),
  exercises: z.array(z.object({ name: z.string(), sets: z.number() })),
});
export type FreeSessionLog = z.infer<typeof FreeSessionLog>;
export const FreeHistory = co.list(FreeSessionLog);

export const FreeTrain = co.map({
  exercises: FreeExercises,
  history: FreeHistory,
});

export function createFreeTrain() {
  return FreeTrain.create({
    exercises: FreeExercises.create([]),
    history: FreeHistory.create([]),
  });
}

export const FREE_TRAIN_ID = "free";

export const WorkoutRoot = co.map({
  activeRoutineId: z.string(),
  routines: RoutineStates,
  // Optional because accounts created before free train don't have it; it's
  // seeded lazily by the app on load.
  freeTrain: FreeTrain.optional(),
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
          activeRoutineId: "e",
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
