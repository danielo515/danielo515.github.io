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

// ─── DATA ────────────────────────────────────────────────────────────────────

const workoutData: WorkoutDay[] = [
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

// ─── TIMER HOOK ──────────────────────────────────────────────────────────────

function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds = 60) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(seconds);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(0);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            // Vibrate pattern: vibrate 300ms, pause 100ms, vibrate 300ms
            navigator.vibrate?.([300, 100, 300]);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

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
  const [activeDay, setActiveDay] = useState(() => {
    try {
      const saved = localStorage.getItem("workout-active-day");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [completed, setCompleted] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("workout-completed");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const { secondsLeft, running, start, stop } = useRestTimer();

  useEffect(() => {
    localStorage.setItem("workout-active-day", String(activeDay));
  }, [activeDay]);

  useEffect(() => {
    localStorage.setItem("workout-completed", JSON.stringify(completed));
  }, [completed]);

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

      {/* Week note */}
      <div
        style={{
          margin: "4px 20px 0",
          padding: "10px 14px",
          background: "#111",
          borderRadius: 8,
          borderLeft: "3px solid #333",
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            color: "#444",
            letterSpacing: "0.08em",
            lineHeight: 1.5,
          }}
        >
          NOTA: 1&apos; de descanso solo en la primera semana. A partir de la
          segunda semana, 1&apos; en todos los días.
        </div>
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
