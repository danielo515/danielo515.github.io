import { useState, useEffect, useRef, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface BaseExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
}

interface SuperSetExercise extends BaseExercise {
  pairedWith: string;
  pairedId: string;
  repsB: string;
}

type Exercise = BaseExercise | SuperSetExercise;

function isSuperSetExercise(ex: Exercise): ex is SuperSetExercise {
  return "pairedWith" in ex;
}

interface ExerciseGroup {
  name: string;
  supersets: boolean;
  exercises: Exercise[];
}

interface WorkoutDay {
  id: number;
  label: string;
  title: string;
  color: string;
  restNote: string;
  groups: ExerciseGroup[];
}

interface WeeklyExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  timesPerWeek: number;
}

interface WorkoutRoutine {
  id: string;
  name: string;
  workoutData: WorkoutDay[];
  weeklyExercises: WeeklyExercise[];
  notes: string[];
}

// ─── DATA ────────────────────────────────────────────────────────────────────

const workoutDataA: WorkoutDay[] = [
  {
    id: 1,
    label: "DÍA 1",
    title: "ESPALDA",
    color: "#00E5FF",
    restNote: "1' entre series",
    groups: [
      {
        name: "ESPALDA",
        supersets: false,
        exercises: [
          { id: "1-1", name: "JALÓN ANCHO AL PECHO", sets: 4, reps: "12" },
          { id: "1-2", name: "REMO GIRONDA", sets: 4, reps: "12" },
          { id: "1-3", name: "REMO HAMMER", sets: 4, reps: "12" },
          { id: "1-4", name: "JALÓN INVERTIDO AL PECHO", sets: 4, reps: "12" },
        ],
      },
      {
        name: "LUMBAR",
        supersets: false,
        exercises: [
          { id: "1-5", name: "HIPEREXTENSIONES", sets: 3, reps: "20" },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "DÍA 2",
    title: "PECHO & BÍCEPS",
    color: "#FF6B35",
    restNote: "1' entre series",
    groups: [
      {
        name: "PECHO",
        supersets: false,
        exercises: [
          { id: "2-1", name: "PRESS PLANO CONVERGENTE", sets: 4, reps: "12" },
          { id: "2-2", name: "APERTURAS MÁQUINA", sets: 4, reps: "12" },
          { id: "2-3", name: "FONDOS EN PARALELAS", sets: 4, reps: "FALLO" },
          { id: "2-4", name: "PRESS SUPERIOR MULTIPOLO", sets: 4, reps: "12" },
        ],
      },
      {
        name: "BÍCEPS",
        supersets: false,
        exercises: [
          { id: "2-5", name: "CURL BARRA Z", sets: 4, reps: "12" },
          { id: "2-6", name: "MARTILLO EN POLEA", sets: 4, reps: "12" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "DÍA 3",
    title: "PIERNA",
    color: "#B8FF3D",
    restNote: "Sin descanso — Superseries",
    groups: [
      {
        name: "SUPERSERIES",
        supersets: true,
        exercises: [
          {
            id: "3-1",
            name: "EXTENSIONES",
            pairedWith: "FEMORAL TUMBADO",
            pairedId: "3-1b",
            sets: 4,
            reps: "15",
            repsB: "10",
          },
          {
            id: "3-2",
            name: "PRENSA",
            pairedWith: "PESO MUERTO",
            pairedId: "3-2b",
            sets: 4,
            reps: "12",
            repsB: "12",
          },
          {
            id: "3-3",
            name: "ZANCADAS CORTAS",
            pairedWith: "FEMORAL SENTADO",
            pairedId: "3-3b",
            sets: 4,
            reps: "8",
            repsB: "10",
          },
        ],
      },
      {
        name: "GEMELO",
        supersets: false,
        exercises: [
          { id: "3-4", name: "GEMELO EN PRENSA", sets: 4, reps: "20" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "DÍA 4",
    title: "HOMBRO & TRÍCEPS",
    color: "#CF6BFF",
    restNote: "1' entre series",
    groups: [
      {
        name: "HOMBRO",
        supersets: false,
        exercises: [
          { id: "4-1", name: "LATERALES DE PIE", sets: 4, reps: "12" },
          { id: "4-2", name: "PRESS HAMMER", sets: 4, reps: "12" },
          { id: "4-3", name: "FRONTALES BARRA Z", sets: 4, reps: "12" },
          { id: "4-4", name: "REMO ANCHO AL CUELLO", sets: 3, reps: "12" },
        ],
      },
      {
        name: "TRÍCEPS",
        supersets: false,
        exercises: [
          { id: "4-5", name: "FRANCÉS BARRA Z", sets: 4, reps: "12" },
          { id: "4-6", name: "POLEA V", sets: 4, reps: "12" },
        ],
      },
    ],
  },
];

const weeklyExercisesA: WeeklyExercise[] = [
  { id: "w-1", name: "ABDOMINALES", sets: 3, reps: "15", timesPerWeek: 2 },
];

const workoutDataB: WorkoutDay[] = [
  {
    id: 1,
    label: "DÍA 1",
    title: "PECHO Y TRÍCEPS",
    color: "#FF6B35",
    restNote: "1' entre series",
    groups: [
      {
        name: "PECHO",
        supersets: false,
        exercises: [
          { id: "b1-1", name: "PRESS SUPERIOR MANC", sets: 6, reps: "8 (+2 DESC)" },
          { id: "b1-2", name: "APERTURAS SUPERIORES", sets: 4, reps: "10" },
          { id: "b1-3", name: "FONDOS PESADOS", sets: 4, reps: "8" },
          { id: "b1-4", name: "PRESS PLANO CONVERGENTE", sets: 4, reps: "15" },
        ],
      },
      {
        name: "TRÍCEPS",
        supersets: true,
        exercises: [
          {
            id: "b1-5",
            name: "POLEA CON CUERDA",
            pairedWith: "FONDOS PARALELAS",
            pairedId: "b1-5b",
            sets: 4,
            reps: "15",
            repsB: "FALLO",
          },
          {
            id: "b1-6",
            name: "FRANCÉS Z",
            pairedWith: "PRESS CERRADO Z",
            pairedId: "b1-6b",
            sets: 4,
            reps: "8",
            repsB: "FALLO",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "DÍA 2",
    title: "PIERNA",
    color: "#B8FF3D",
    restNote: "1' entre series",
    groups: [
      {
        name: "PIERNA",
        supersets: false,
        exercises: [
          { id: "b2-1", name: "EXTENSIÓN", sets: 6, reps: "12 (+2x20)" },
          { id: "b2-2", name: "PRENSA DISCOS", sets: 6, reps: "12 (+2x30)" },
          { id: "b2-3", name: "FEMORAL TUMBADO", sets: 6, reps: "8 (+2 DESC)" },
          { id: "b2-4", name: "FEMORAL SENTADO", sets: 4, reps: "12" },
        ],
      },
      {
        name: "GEMELO",
        supersets: false,
        exercises: [
          { id: "b2-5", name: "GEMELO EN PRENSA", sets: 5, reps: "12 (+1x30)" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "DÍA 3",
    title: "HOMBRO",
    color: "#CF6BFF",
    restNote: "1' entre series",
    groups: [
      {
        name: "HOMBRO",
        supersets: false,
        exercises: [
          { id: "b3-1", name: "LATERALES SENTADO", sets: 4, reps: "12" },
          { id: "b3-2", name: "LATERALES DE PIE", sets: 5, reps: "6 (+2x20)" },
          { id: "b3-3", name: "PRESS MANCUERNAS", sets: 6, reps: "8 (+2 DESC +1x20)" },
          { id: "b3-4", name: "PÁJAROS MÁQUINA", sets: 4, reps: "12" },
          { id: "b3-5", name: "ENCOGIMIENTOS", sets: 3, reps: "12" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "DÍA 4",
    title: "ESPALDA Y BÍCEPS",
    color: "#00E5FF",
    restNote: "1' entre series",
    groups: [
      {
        name: "ESPALDA",
        supersets: false,
        exercises: [
          { id: "b4-1", name: "JALÓN INVERTIDO AL PECHO", sets: 5, reps: "8 (+1x15)" },
          { id: "b4-2", name: "REMO MANCUERNA", sets: 5, reps: "8 (+1x12)" },
          { id: "b4-3", name: "REMO GIRONDA", sets: 4, reps: "10" },
          { id: "b4-4", name: "REMO Z INVERTIDO", sets: 5, reps: "6 (+2x12)" },
        ],
      },
      {
        name: "BÍCEPS",
        supersets: true,
        exercises: [
          {
            id: "b4-5",
            name: "CURL BARRA Z ABIERTA",
            pairedWith: "MARTILLO EN POLEA",
            pairedId: "b4-5b",
            sets: 4,
            reps: "8",
            repsB: "12",
          },
        ],
      },
      {
        name: "BÍCEPS",
        supersets: false,
        exercises: [
          { id: "b4-6", name: "PREDICADOR Z", sets: 5, reps: "8 (+1x12 CERRADO)" },
        ],
      },
    ],
  },
];

const weeklyExercisesB: WeeklyExercise[] = [
  { id: "wb-1", name: "ENCOGIMIENTOS EN POLEA", sets: 4, reps: "20", timesPerWeek: 2 },
  { id: "wb-2", name: "ELEVACIÓN DE PIERNAS", sets: 4, reps: "FALLO", timesPerWeek: 2 },
];

const routines: WorkoutRoutine[] = [
  {
    id: "a",
    name: "RUTINA A",
    workoutData: workoutDataA,
    weeklyExercises: weeklyExercisesA,
    notes: [
      "1' de descanso solo en la primera semana. A partir de la segunda semana, 1' en todos los días.",
    ],
  },
  {
    id: "b",
    name: "RUTINA B",
    workoutData: workoutDataB,
    weeklyExercises: weeklyExercisesB,
    notes: [
      "TODOS LOS DÍAS TRAS LAS PESAS: 10' DE CARDIO HIT + 10' DE LISS",
      "DOS DÍAS EN SEMANA: ABDOMEN (incluido en ejercicios semanales)",
    ],
  },
];

// ─── TIMER HOOK ──────────────────────────────────────────────────────────────

async function postToSW(msg: Record<string, unknown>) {
  const sw = navigator.serviceWorker;
  if (!sw) return;
  // controller may be null if the SW just installed; wait for it
  if (sw.controller) {
    sw.controller.postMessage(msg);
    return;
  }
  const reg = await sw.ready;
  const worker = reg.active;
  if (worker) worker.postMessage(msg);
}

function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const endTimeRef = useRef(0);
  const rafRef = useRef(0);

  // Register the service worker once and request notification permission
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/workout-sw.js").catch(() => {});
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    endTimeRef.current = 0;
    setSecondsLeft(0);
    setRunning(false);
    navigator.vibrate?.([200, 100, 200, 100, 400, 200, 200, 100, 200, 100, 400]);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Rest timer done!", {
        body: "Time to start your next set",
        tag: "workout-rest-timer",
      });
    }
  }, []);

  const tick = useCallback(() => {
    if (endTimeRef.current === 0) return;
    const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
    if (remaining <= 0) {
      finish();
      return;
    }
    setSecondsLeft(remaining);
    rafRef.current = requestAnimationFrame(tick);
  }, [finish]);

  // When the tab becomes visible again, catch up with the timer
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && endTimeRef.current > 0) {
        cancelAnimationFrame(rafRef.current);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tick]);

  const start = useCallback(
    (seconds = 60) => {
      cancelAnimationFrame(rafRef.current);
      const delayMs = seconds * 1000;
      endTimeRef.current = Date.now() + delayMs;
      setSecondsLeft(seconds);
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
      postToSW({ type: "START_TIMER", delayMs });
    },
    [tick],
  );

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    endTimeRef.current = 0;
    setRunning(false);
    setSecondsLeft(0);
    postToSW({ type: "STOP_TIMER" });
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { secondsLeft, running, start, stop };
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function SetDot({
  done,
  onClick,
  color,
}: {
  done: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: `2px solid ${done ? color : "#444"}`,
        background: done ? color : "transparent",
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {done && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2 6l3 3 5-5"
            stroke="#0a0a0a"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function ExerciseRow({
  exercise,
  color,
  onSetDone,
  completedSets,
  isSuperSet = false,
  showRestTimer,
}: {
  exercise: Exercise;
  color: string;
  onSetDone: (exerciseId: string, setNum: number) => void;
  completedSets: number;
  isSuperSet?: boolean;
  showRestTimer: () => void;
}) {
  const totalSets = exercise.sets;

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: "1px solid #1e1e1e",
      }}
    >
      {isSuperSet && isSuperSetExercise(exercise) ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {exercise.name}
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    color: color,
                    background: color + "22",
                    padding: "1px 6px",
                    borderRadius: 3,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                  }}
                >
                  {exercise.reps} REPS
                </span>
                <span
                  style={{ color: "#555", fontSize: 12, fontWeight: 700 }}
                >
                  +
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {exercise.pairedWith}
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    color: color,
                    background: color + "22",
                    padding: "1px 6px",
                    borderRadius: 3,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                  }}
                >
                  {exercise.repsB} REPS
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  color: "#555",
                  marginTop: 2,
                  letterSpacing: "0.06em",
                }}
              >
                {exercise.sets} SERIES
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <SetDot
                key={i}
                done={completedSets > i}
                color={color}
                onClick={() => {
                  onSetDone(exercise.id, i + 1);
                  if (completedSets === i) showRestTimer();
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {exercise.name}
            </div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                color: "#555",
                letterSpacing: "0.06em",
                marginTop: 1,
              }}
            >
              {exercise.sets} x {exercise.reps}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <SetDot
                key={i}
                done={completedSets > i}
                color={color}
                onClick={() => {
                  onSetDone(exercise.id, i + 1);
                  if (completedSets === i) showRestTimer();
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RestTimerBar({
  secondsLeft,
  running,
  onStart,
  onStop,
  color,
}: {
  secondsLeft: number;
  running: boolean;
  onStart: (seconds: number) => void;
  onStop: () => void;
  color: string;
}) {
  const total = 60;
  const progress = running ? (secondsLeft / total) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#0f0f0f",
        borderTop: `1px solid ${running ? color : "#1e1e1e"}`,
        padding: "12px 20px 20px",
        zIndex: 100,
        transition: "border-color 0.3s",
      }}
    >
      {running && (
        <div
          style={{
            height: 3,
            background: "#1e1e1e",
            borderRadius: 2,
            marginBottom: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: color,
              borderRadius: 2,
              transition: "width 1s linear",
            }}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: "#555",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {running ? "DESCANSO" : "INICIAR DESCANSO"}
          </div>
          {running && (
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 36,
                fontWeight: 800,
                color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onStart(60)}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "8px 16px",
              background: color + "22",
              color,
              border: `1px solid ${color}44`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            1:00
          </button>
          <button
            onClick={() => onStart(90)}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "8px 16px",
              background: "#1a1a1a",
              color: "#888",
              border: "1px solid #333",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            1:30
          </button>
          {running && (
            <button
              onClick={onStop}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "8px 14px",
                background: "#1a1a1a",
                color: "#555",
                border: "1px solid #333",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              X
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function WorkoutApp() {
  // ── Helpers for per-routine localStorage ──
  const loadActiveDay = (rid: string) => {
    try {
      const saved = localStorage.getItem(`workout-${rid}-active-day`);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  };
  const loadCompleted = (rid: string): Record<string, number> => {
    try {
      const saved = localStorage.getItem(`workout-${rid}-completed`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };
  const loadWeekHistory = (rid: string): number[] => {
    try {
      const saved = localStorage.getItem(`workout-${rid}-week-history`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  // ── Routine selection (new routine "b" is default) ──
  const [activeRoutineId, setActiveRoutineId] = useState(() => {
    try {
      // Migration: move old data to routine "a" namespace
      if (!localStorage.getItem("workout-routine")) {
        const oldCompleted = localStorage.getItem("workout-completed");
        const oldActiveDay = localStorage.getItem("workout-active-day");
        const oldWeekHistory = localStorage.getItem("workout-week-history");
        if (oldCompleted) localStorage.setItem("workout-a-completed", oldCompleted);
        if (oldActiveDay) localStorage.setItem("workout-a-active-day", oldActiveDay);
        if (oldWeekHistory) localStorage.setItem("workout-a-week-history", oldWeekHistory);
        localStorage.setItem("workout-routine", "b");
        return "b";
      }
      return localStorage.getItem("workout-routine") || "b";
    } catch {
      return "b";
    }
  });

  const routine = routines.find((r) => r.id === activeRoutineId) ?? routines[1]!;
  const workoutData = routine.workoutData;
  const weeklyExercises = routine.weeklyExercises;

  const [activeDay, setActiveDay] = useState(() => loadActiveDay(activeRoutineId));
  const [completed, setCompleted] = useState<Record<string, number>>(() => loadCompleted(activeRoutineId));
  const [weekHistory, setWeekHistory] = useState<number[]>(() => loadWeekHistory(activeRoutineId));
  const { secondsLeft, running, start, stop } = useRestTimer();

  const switchRoutine = (newId: string) => {
    setActiveRoutineId(newId);
    localStorage.setItem("workout-routine", newId);
    setActiveDay(loadActiveDay(newId));
    setCompleted(loadCompleted(newId));
    setWeekHistory(loadWeekHistory(newId));
  };

  useEffect(() => {
    localStorage.setItem(`workout-${activeRoutineId}-active-day`, String(activeDay));
  }, [activeDay, activeRoutineId]);

  useEffect(() => {
    localStorage.setItem(`workout-${activeRoutineId}-completed`, JSON.stringify(completed));
  }, [completed, activeRoutineId]);

  useEffect(() => {
    localStorage.setItem(`workout-${activeRoutineId}-week-history`, JSON.stringify(weekHistory));
  }, [weekHistory, activeRoutineId]);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const day = workoutData[activeDay]!;

  const handleSetDone = (exerciseId: string, setNum: number) => {
    setCompleted((prev) => {
      const current = prev[exerciseId] ?? 0;
      const newVal = current === setNum ? setNum - 1 : setNum;
      return { ...prev, [exerciseId]: newVal };
    });
  };

  const getTotalSets = (d: WorkoutDay) =>
    d.groups
      .flatMap((g) => g.exercises)
      .reduce((acc, ex) => acc + ex.sets, 0);

  const getCompletedSets = (d: WorkoutDay) =>
    d.groups
      .flatMap((g) => g.exercises)
      .reduce((acc, ex) => acc + (completed[ex.id] ?? 0), 0);

  const dayProgress = getCompletedSets(day);
  const dayTotal = getTotalSets(day);
  const progressPct = dayTotal > 0 ? (dayProgress / dayTotal) * 100 : 0;

  const resetDay = () => {
    const ids = day.groups.flatMap((g) => g.exercises.map((e) => e.id));
    setCompleted((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  };

  const allDaysComplete = workoutData.every(
    (d) => getCompletedSets(d) === getTotalSets(d) && getTotalSets(d) > 0,
  );

  const allWeeklyComplete = weeklyExercises.every((ex) => {
    for (let s = 1; s <= ex.timesPerWeek; s++) {
      if ((completed[`${ex.id}-s${s}`] ?? 0) < ex.sets) return false;
    }
    return true;
  });

  const allWeekComplete = allDaysComplete && allWeeklyComplete;

  const completeWeek = () => {
    if (!allWeekComplete) return;
    setWeekHistory((prev) => [...prev, Date.now()]);
    setCompleted({});
    setActiveDay(0);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      activeDay,
      completed,
      weekHistory,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.completed) setCompleted(data.completed);
        if (data.weekHistory) setWeekHistory(data.weekHistory);
        if (typeof data.activeDay === "number") setActiveDay(data.activeDay);
      } catch {
        alert("Error al leer el archivo de backup");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
        paddingBottom: 120,
      }}
    >
      {/* Routine selector */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        {routines.map((r) => (
          <button
            key={r.id}
            onClick={() => switchRoutine(r.id)}
            style={{
              flex: 1,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: r.id === activeRoutineId ? 700 : 500,
              letterSpacing: "0.1em",
              color: r.id === activeRoutineId ? "#fff" : "#555",
              background: r.id === activeRoutineId ? "#1a1a1a" : "transparent",
              border: "none",
              borderBottom: `2px solid ${r.id === activeRoutineId ? day.color : "transparent"}`,
              padding: "12px 16px",
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          padding: "24px 20px 0",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: "#444",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              PROGRAMA DE ENTRENAMIENTO
            </div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                color: "#fff",
              }}
            >
              {day.label}:{" "}
              <span style={{ color: day.color }}>{day.title}</span>
            </div>
          </div>
          <button
            onClick={resetDay}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "#444",
              background: "transparent",
              border: "1px solid #222",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            RESET
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: "#444",
                letterSpacing: "0.1em",
              }}
            >
              PROGRESO
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: day.color,
                letterSpacing: "0.06em",
              }}
            >
              {dayProgress}/{dayTotal} SERIES
            </span>
          </div>
          <div
            style={{
              height: 3,
              background: "#1a1a1a",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: day.color,
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Day tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            overflowX: "auto",
          }}
        >
          {workoutData.map((d, i) => {
            const done = getCompletedSets(d);
            const total = getTotalSets(d);
            const isActive = i === activeDay;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDay(i)}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.08em",
                  color: isActive ? d.color : "#444",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? d.color : "transparent"}`,
                  padding: "8px 16px 12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {d.label}
                {done > 0 && done < total && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: d.color,
                      marginLeft: 5,
                      verticalAlign: "middle",
                    }}
                  />
                )}
                {done === total && done > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10 }}>
                    {"✓"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rest note */}
      <div
        style={{
          margin: "12px 20px 0",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: day.color + "11",
          border: `1px solid ${day.color}33`,
          borderRadius: 6,
          padding: "5px 10px",
        }}
      >
        <span style={{ fontSize: 12 }}>{"⏱"}</span>
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            color: day.color,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {day.restNote}
        </span>
      </div>

      {/* Exercise groups */}
      <div style={{ padding: "16px 20px 0" }}>
        {day.groups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 24 }}>
            {/* Group header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#444",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {group.name}
              </span>
              {group.supersets && (
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 9,
                    color: day.color,
                    background: day.color + "22",
                    padding: "1px 6px",
                    borderRadius: 3,
                    letterSpacing: "0.1em",
                  }}
                >
                  SUPERSERIE
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
            </div>

            {group.exercises.map((ex) => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                color={day.color}
                isSuperSet={group.supersets}
                completedSets={completed[ex.id] ?? 0}
                onSetDone={handleSetDone}
                showRestTimer={() => start(60)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Weekly exercises */}
      {weeklyExercises.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: "#444",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              EJERCICIOS SEMANALES
            </span>
            <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
          </div>
          {weeklyExercises.map((ex) => (
            <div key={ex.id} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {ex.name}
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  color: "#555",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                {ex.sets} x {ex.reps} — {ex.timesPerWeek}x SEMANA
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: ex.timesPerWeek }).map((_, si) => {
                  const sessionKey = `${ex.id}-s${si + 1}`;
                  const doneSets = completed[sessionKey] ?? 0;
                  const allDone = doneSets >= ex.sets;
                  return (
                    <div
                      key={si}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: allDone ? "#22c55e11" : "#111",
                        border: allDone
                          ? "1px solid #22c55e33"
                          : "1px solid #1a1a1a",
                        borderRadius: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          color: allDone ? "#22c55e" : "#666",
                          letterSpacing: "0.06em",
                        }}
                      >
                        SESIÓN {si + 1}
                        {allDone && (
                          <span style={{ marginLeft: 6, fontSize: 10 }}>
                            {"✓"}
                          </span>
                        )}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {Array.from({ length: ex.sets }).map((_, setIdx) => (
                          <SetDot
                            key={setIdx}
                            done={doneSets > setIdx}
                            color="#22c55e"
                            onClick={() =>
                              handleSetDone(sessionKey, setIdx + 1)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete week button */}
      <div style={{ padding: "20px 20px 0" }}>
        <button
          onClick={completeWeek}
          disabled={!allWeekComplete}
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            width: "100%",
            padding: "14px 20px",
            background: allWeekComplete ? "#22c55e" : "#1a1a1a",
            color: allWeekComplete ? "#000" : "#333",
            border: allWeekComplete
              ? "1px solid #22c55e"
              : "1px solid #222",
            borderRadius: 8,
            cursor: allWeekComplete ? "pointer" : "default",
            transition: "all 0.3s ease",
          }}
        >
          {allWeekComplete
            ? "✓ COMPLETAR SEMANA"
            : `COMPLETAR SEMANA (${workoutData.filter((d) => getCompletedSets(d) === getTotalSets(d) && getTotalSets(d) > 0).length}/${workoutData.length} DÍAS${!allWeeklyComplete ? " + SEMANALES" : ""})`}
        </button>
      </div>

      {/* Week history */}
      {weekHistory.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: "#444",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            SEMANAS COMPLETADAS — {weekHistory.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {weekHistory.map((ts, i) => (
              <div
                key={ts}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "#111",
                  borderRadius: 6,
                  borderLeft: "3px solid #22c55e",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#22c55e",
                    letterSpacing: "0.06em",
                  }}
                >
                  SEMANA {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12,
                    color: "#555",
                    letterSpacing: "0.04em",
                  }}
                >
                  {new Date(ts).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routine notes */}
      {routine.notes.map((note, i) => (
        <div
          key={i}
          style={{
            margin: `${i === 0 ? 16 : 8}px 20px 0`,
            padding: "10px 14px",
            background: "#111",
            borderRadius: 8,
            borderLeft: `3px solid ${day.color}44`,
          }}
        >
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: "#444",
              letterSpacing: "0.08em",
              lineHeight: 1.5,
              textTransform: "uppercase",
            }}
          >
            {note}
          </div>
        </div>
      ))}

      {/* Export / Import */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "16px 20px 0",
        }}
      >
        <button
          onClick={exportData}
          style={{
            flex: 1,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "10px 14px",
            background: "#1a1a1a",
            color: "#888",
            border: "1px solid #333",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          EXPORTAR DATOS
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importData(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "10px 14px",
            background: "#1a1a1a",
            color: "#888",
            border: "1px solid #333",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          IMPORTAR DATOS
        </button>
      </div>

      {/* Rest timer */}
      <RestTimerBar
        secondsLeft={secondsLeft}
        running={running}
        onStart={start}
        onStop={stop}
        color={day.color}
      />
    </div>
  );
}
