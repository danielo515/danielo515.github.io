import { useState, type CSSProperties } from "react";
import type { co } from "jazz-tools";
import type { FreeTrain } from "./schema/Workout";
import { formatRest } from "./format";

// ─── FREE TRAIN ──────────────────────────────────────────────────────────────
// Improvised workout: add exercises as you go, log as many sets as you like on
// each, and give each exercise its own rest (what +1 starts the timer with).

export const FREE_TRAIN_COLOR = "#FF3D8B";

const DEFAULT_REST = 60;
const REST_STEP = 15;
const MIN_REST = 0;
const MAX_REST = 600;
const REST_CHOICES = [30, 45, 60, 90, 120, 180];
const HISTORY_SHOWN = 10;

export type LoadedFreeTrain = co.loaded<
  typeof FreeTrain,
  { exercises: { $each: true }; history: true }
>;
type LoadedFreeExercise = LoadedFreeTrain["exercises"][number];

const font = "'Barlow Condensed', sans-serif";

const sectionLabelStyle: CSSProperties = {
  fontFamily: font,
  fontSize: 10,
  fontWeight: 700,
  color: "#444",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const ghostButtonStyle: CSSProperties = {
  fontFamily: font,
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "#444",
  background: "transparent",
  border: "1px solid #222",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};

const clampRest = (seconds: number) =>
  Math.min(MAX_REST, Math.max(MIN_REST, Math.round(seconds)));

function RestChoices({
  value,
  color,
  onChange,
}: {
  value: number;
  color: string;
  onChange: (seconds: number) => void;
}) {
  const stepButton = (label: string, delta: number) => (
    <button
      type="button"
      onClick={() => onChange(clampRest(value + delta))}
      aria-label={`${delta > 0 ? "Más" : "Menos"} descanso`}
      style={{
        fontFamily: font,
        fontSize: 13,
        fontWeight: 700,
        width: 34,
        padding: "6px 0",
        background: "#1a1a1a",
        color: "#888",
        border: "1px solid #333",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {REST_CHOICES.map((choice) => {
          const active = choice === value;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onChange(choice)}
              style={{
                fontFamily: font,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "6px 10px",
                background: active ? color + "22" : "#1a1a1a",
                color: active ? color : "#888",
                border: active ? `1px solid ${color}66` : "1px solid #333",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {formatRest(choice)}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {stepButton("−", -REST_STEP)}
        <span
          style={{
            fontFamily: font,
            fontSize: 16,
            fontWeight: 800,
            color,
            minWidth: 52,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatRest(value)}
        </span>
        {stepButton("+", REST_STEP)}
      </div>
    </div>
  );
}

function FreeExerciseRow({
  exercise,
  color,
  onStartRest,
  onRemove,
}: {
  exercise: LoadedFreeExercise;
  color: string;
  onStartRest: (seconds: number) => void;
  onRemove: () => void;
}) {
  const [editingRest, setEditingRest] = useState(false);
  const sets = exercise.sets;

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: "1px solid #1e1e1e",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: font,
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            wordBreak: "break-word",
          }}
        >
          {exercise.name}
        </span>
        <button
          onClick={() => {
            if (sets === 0 || confirm(`¿Eliminar ${exercise.name}?`)) onRemove();
          }}
          aria-label={`Eliminar ${exercise.name}`}
          style={{ ...ghostButtonStyle, padding: "2px 8px", flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setEditingRest((v) => !v)}
          aria-expanded={editingRest}
          style={{
            fontFamily: font,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            padding: "8px 12px",
            borderRadius: 8,
            color: editingRest ? "#0a0a0a" : color,
            background: editingRest ? color : color + "1a",
            border: `1px solid ${editingRest ? color : color + "55"}`,
            cursor: "pointer",
          }}
        >
          ⏱ DESCANSO {formatRest(exercise.rest)}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => exercise.$jazz.set("sets", Math.max(0, sets - 1))}
            disabled={sets === 0}
            aria-label="Quitar una serie"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: "#1a1a1a",
              color: "#888",
              border: "1px solid #333",
              cursor: sets === 0 ? "default" : "pointer",
              opacity: sets === 0 ? 0.4 : 1,
              fontFamily: font,
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            −
          </button>
          <div style={{ textAlign: "center", minWidth: 42 }}>
            <div
              style={{
                fontFamily: font,
                fontSize: 30,
                fontWeight: 800,
                color,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sets}
            </div>
            <div
              style={{
                fontFamily: font,
                fontSize: 9,
                color: "#555",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              SERIES
            </div>
          </div>
          <button
            onClick={() => {
              exercise.$jazz.set("sets", sets + 1);
              if (exercise.rest > 0) onStartRest(exercise.rest);
            }}
            aria-label="Añadir una serie e iniciar el descanso"
            style={{
              minWidth: 66,
              height: 38,
              borderRadius: 8,
              background: color,
              color: "#0a0a0a",
              border: `1px solid ${color}`,
              cursor: "pointer",
              fontFamily: font,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "0 14px",
            }}
          >
            +1
          </button>
        </div>
      </div>

      {editingRest && (
        <RestChoices
          value={exercise.rest}
          color={color}
          onChange={(seconds) => exercise.$jazz.set("rest", seconds)}
        />
      )}
    </div>
  );
}

export function FreeTrainView({
  freeTrain,
  onStartRest,
}: {
  freeTrain: LoadedFreeTrain;
  onStartRest: (seconds: number) => void;
}) {
  const color = FREE_TRAIN_COLOR;
  const { exercises, history } = freeTrain;

  const lastRest = exercises.at(-1)?.rest ?? DEFAULT_REST;
  const [name, setName] = useState("");
  const [rest, setRest] = useState<number | null>(null);
  // Until the user picks a rest for the next exercise, reuse the last one's.
  const newRest = rest ?? lastRest;

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);

  // Previously used exercise names, offered as autocomplete suggestions.
  const suggestions = [
    ...new Set(
      [...history]
        .reverse()
        .flatMap((log) => log.exercises.map((ex) => ex.name)),
    ),
  ];

  const addExercise = () => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    exercises.$jazz.push({ name: trimmed, rest: newRest, sets: 0 });
    setName("");
    setRest(null);
  };

  const finishSession = () => {
    const done = exercises
      .filter((ex) => ex.sets > 0)
      .map((ex) => ({ name: ex.name, sets: ex.sets }));
    if (done.length === 0) return;
    if (!confirm("¿Terminar la sesión? Se guardará en el historial.")) return;
    history.$jazz.push({ finishedAt: Date.now(), exercises: done });
    exercises.$jazz.splice(0, exercises.length);
  };

  const resetSession = () => {
    if (exercises.length === 0) return;
    if (!confirm("¿Descartar la sesión actual sin guardarla?")) return;
    exercises.$jazz.splice(0, exercises.length);
  };

  const recentHistory = [...history].reverse().slice(0, HISTORY_SHOWN);

  return (
    <>
      {/* Header */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1a1a1a" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ ...sectionLabelStyle, fontWeight: 400, marginBottom: 2 }}>
              SIN RUTINA
            </div>
            <div
              style={{
                fontFamily: font,
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                color: "#fff",
              }}
            >
              ENTRENO <span style={{ color }}>LIBRE</span>
            </div>
          </div>
          <button onClick={resetSession} style={ghostButtonStyle}>
            RESET
          </button>
        </div>
        <div
          style={{
            fontFamily: font,
            fontSize: 11,
            color,
            letterSpacing: "0.06em",
          }}
        >
          {exercises.length} EJERCICIOS · {totalSets} SERIES
        </div>
      </div>

      {/* Exercises */}
      <div style={{ padding: "8px 20px 0" }}>
        {exercises.length === 0 && (
          <div
            style={{
              fontFamily: font,
              fontSize: 13,
              color: "#555",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "16px 0",
            }}
          >
            Sin ejercicios todavía. Añade el primero abajo.
          </div>
        )}
        {exercises.map((ex, i) => (
          <FreeExerciseRow
            key={ex.$jazz.id}
            exercise={ex}
            color={color}
            onStartRest={onStartRest}
            onRemove={() => exercises.$jazz.remove(i)}
          />
        ))}
      </div>

      {/* Add exercise */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addExercise();
        }}
        style={{
          margin: "16px 20px 0",
          padding: 14,
          background: "#111",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={sectionLabelStyle}>AÑADIR EJERCICIO</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ejercicio"
            list="free-train-suggestions"
            autoCapitalize="characters"
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: font,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#fff",
              background: "#0a0a0a",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "10px 12px",
              outline: "none",
            }}
          />
          <datalist id="free-train-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              fontFamily: font,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.08em",
              padding: "0 16px",
              borderRadius: 6,
              background: name.trim() ? color : "#1a1a1a",
              color: name.trim() ? "#0a0a0a" : "#444",
              border: `1px solid ${name.trim() ? color : "#333"}`,
              cursor: name.trim() ? "pointer" : "default",
            }}
          >
            AÑADIR
          </button>
        </div>
        <div style={{ ...sectionLabelStyle, color: "#555" }}>
          DESCANSO ENTRE SERIES
        </div>
        <RestChoices value={newRest} color={color} onChange={setRest} />
      </form>

      {/* Finish session */}
      <div style={{ padding: "20px 20px 0" }}>
        <button
          onClick={finishSession}
          disabled={totalSets === 0}
          style={{
            fontFamily: font,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            width: "100%",
            padding: "14px 20px",
            background: totalSets > 0 ? "#22c55e" : "#1a1a1a",
            color: totalSets > 0 ? "#000" : "#333",
            border: totalSets > 0 ? "1px solid #22c55e" : "1px solid #222",
            borderRadius: 8,
            cursor: totalSets > 0 ? "pointer" : "default",
            transition: "all 0.3s ease",
          }}
        >
          {totalSets > 0 ? "✓ TERMINAR SESIÓN" : "TERMINAR SESIÓN (SIN SERIES)"}
        </button>
      </div>

      {/* History */}
      {recentHistory.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 8 }}>
            SESIONES LIBRES — {history.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentHistory.map((log) => (
              <div
                key={log.finishedAt}
                style={{
                  padding: "8px 12px",
                  background: "#111",
                  borderRadius: 6,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span
                    style={{
                      fontFamily: font,
                      fontSize: 13,
                      fontWeight: 700,
                      color,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {new Date(log.finishedAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    style={{
                      fontFamily: font,
                      fontSize: 12,
                      color: "#555",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {log.exercises.length} EJERCICIOS ·{" "}
                    {log.exercises.reduce((acc, ex) => acc + ex.sets, 0)} SERIES
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: font,
                    fontSize: 11,
                    color: "#666",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  {log.exercises.map((ex) => `${ex.name} ×${ex.sets}`).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
