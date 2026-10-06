import { useState } from "react";
import type { co } from "jazz-tools";
import type { FreeTrain } from "./schema/Workout";
import { formatRest } from "./format";

// ─── FREE TRAIN ──────────────────────────────────────────────────────────────
// Improvised workout: add exercises as you go, log as many sets as you like on
// each, and give each exercise its own rest (what +1 starts the timer with).
// Styled with Tailwind; tokens (wk-*, free) live in src/styles/workout.css.

// Mirrors --color-free in workout.css, for the inline-styled shared components
// (tab bar, rest timer, sync panel) that take the accent as a hex string.
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

const sectionLabel =
  "font-condensed text-[10px] font-bold uppercase tracking-[0.14em] text-wk-dim";

const ghostButton =
  "cursor-pointer rounded-md border border-wk-edge bg-transparent font-condensed text-[11px] tracking-widest text-wk-dim";

const stepButton =
  "cursor-pointer rounded-md border border-wk-border bg-wk-raised font-condensed font-bold text-wk-subtle";

const clampRest = (seconds: number) =>
  Math.min(MAX_REST, Math.max(MIN_REST, Math.round(seconds)));

function RestChoices({
  value,
  onChange,
}: {
  value: number;
  onChange: (seconds: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {REST_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onChange(choice)}
            className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-condensed text-[13px] font-bold tracking-[0.06em] ${
              choice === value
                ? "border-free/40 bg-free/15 text-free"
                : "border-wk-border bg-wk-raised text-wk-subtle"
            }`}
          >
            {formatRest(choice)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clampRest(value - REST_STEP))}
          aria-label="Menos descanso"
          className={`${stepButton} w-[34px] py-1.5 text-[13px]`}
        >
          −
        </button>
        <span className="min-w-[52px] text-center font-condensed text-base font-extrabold tabular-nums text-free">
          {formatRest(value)}
        </span>
        <button
          type="button"
          onClick={() => onChange(clampRest(value + REST_STEP))}
          aria-label="Más descanso"
          className={`${stepButton} w-[34px] py-1.5 text-[13px]`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function FreeExerciseRow({
  exercise,
  onStartRest,
  onRemove,
}: {
  exercise: LoadedFreeExercise;
  onStartRest: (seconds: number) => void;
  onRemove: () => void;
}) {
  const [editingRest, setEditingRest] = useState(false);
  const sets = exercise.sets;

  return (
    <div className="flex flex-col gap-2.5 border-b border-wk-line py-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className="break-words font-condensed text-[15px] font-bold uppercase tracking-[0.04em] text-white">
          {exercise.name}
        </span>
        <button
          onClick={() => {
            if (sets === 0 || confirm(`¿Eliminar ${exercise.name}?`)) onRemove();
          }}
          aria-label={`Eliminar ${exercise.name}`}
          className={`${ghostButton} shrink-0 px-2 py-0.5`}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setEditingRest((v) => !v)}
          aria-expanded={editingRest}
          className={`cursor-pointer rounded-lg border px-3 py-2 font-condensed text-[13px] font-bold tracking-[0.06em] ${
            editingRest
              ? "border-free bg-free text-wk-bg"
              : "border-free/35 bg-free/10 text-free"
          }`}
        >
          ⏱ DESCANSO {formatRest(exercise.rest)}
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exercise.$jazz.set("sets", Math.max(0, sets - 1))}
            disabled={sets === 0}
            aria-label="Quitar una serie"
            className={`${stepButton} size-[38px] rounded-lg text-[22px] leading-none disabled:cursor-default disabled:opacity-40`}
          >
            −
          </button>
          <div className="min-w-[42px] text-center">
            <div className="font-condensed text-[30px] font-extrabold leading-none tabular-nums text-free">
              {sets}
            </div>
            <div className="mt-0.5 font-condensed text-[9px] uppercase tracking-[0.14em] text-wk-muted">
              SERIES
            </div>
          </div>
          <button
            onClick={() => {
              exercise.$jazz.set("sets", sets + 1);
              if (exercise.rest > 0) onStartRest(exercise.rest);
            }}
            aria-label="Añadir una serie e iniciar el descanso"
            className="h-[38px] min-w-[66px] cursor-pointer rounded-lg border border-free bg-free px-3.5 font-condensed text-base font-extrabold tracking-[0.04em] text-wk-bg"
          >
            +1
          </button>
        </div>
      </div>

      {editingRest && (
        <RestChoices
          value={exercise.rest}
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
  const { exercises, history } = freeTrain;

  const lastRest = exercises.at(-1)?.rest ?? DEFAULT_REST;
  const [name, setName] = useState("");
  const [rest, setRest] = useState<number | null>(null);
  // Until the user picks a rest for the next exercise, reuse the last one's.
  const newRest = rest ?? lastRest;
  const canAdd = name.trim().length > 0;

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
      <div className="border-b border-wk-raised px-5 pb-4 pt-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className={`${sectionLabel} mb-0.5 font-normal`}>SIN RUTINA</div>
            <div className="font-condensed text-[32px] font-black leading-none tracking-[-0.01em] text-white">
              ENTRENO <span className="text-free">LIBRE</span>
            </div>
          </div>
          <button onClick={resetSession} className={`${ghostButton} px-2.5 py-1.5`}>
            RESET
          </button>
        </div>
        <div className="font-condensed text-[11px] tracking-[0.06em] text-free">
          {exercises.length} EJERCICIOS · {totalSets} SERIES
        </div>
      </div>

      {/* Exercises */}
      <div className="px-5 pt-2">
        {exercises.length === 0 && (
          <div className="py-4 font-condensed text-[13px] uppercase tracking-[0.06em] text-wk-muted">
            Sin ejercicios todavía. Añade el primero abajo.
          </div>
        )}
        {exercises.map((ex, i) => (
          <FreeExerciseRow
            key={ex.$jazz.id}
            exercise={ex}
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
        className="mx-5 mt-4 flex flex-col gap-3 rounded-lg border border-wk-raised bg-wk-card p-3.5"
      >
        <div className={sectionLabel}>AÑADIR EJERCICIO</div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ejercicio"
            list="free-train-suggestions"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-md border border-wk-border bg-wk-bg px-3 py-2.5 font-condensed text-base font-semibold uppercase tracking-[0.04em] text-white outline-none placeholder:text-wk-muted focus:border-free/60"
          />
          <datalist id="free-train-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={!canAdd}
            className={`rounded-md border px-4 font-condensed text-sm font-extrabold tracking-[0.08em] ${
              canAdd
                ? "cursor-pointer border-free bg-free text-wk-bg"
                : "cursor-default border-wk-border bg-wk-raised text-wk-dim"
            }`}
          >
            AÑADIR
          </button>
        </div>
        <div className={`${sectionLabel} text-wk-muted`}>DESCANSO ENTRE SERIES</div>
        <RestChoices value={newRest} onChange={setRest} />
      </form>

      {/* Finish session */}
      <div className="px-5 pt-5">
        <button
          onClick={finishSession}
          disabled={totalSets === 0}
          className={`w-full rounded-lg border px-5 py-3.5 font-condensed text-[15px] font-extrabold uppercase tracking-widest transition-all duration-300 ${
            totalSets > 0
              ? "cursor-pointer border-wk-done bg-wk-done text-black"
              : "cursor-default border-wk-edge bg-wk-raised text-wk-border"
          }`}
        >
          {totalSets > 0 ? "✓ TERMINAR SESIÓN" : "TERMINAR SESIÓN (SIN SERIES)"}
        </button>
      </div>

      {/* History */}
      {recentHistory.length > 0 && (
        <div className="px-5 pt-4">
          <div className={`${sectionLabel} mb-2`}>
            SESIONES LIBRES — {history.length}
          </div>
          <div className="flex flex-col gap-1.5">
            {recentHistory.map((log) => (
              <div
                key={log.finishedAt}
                className="rounded-md border-l-[3px] border-free bg-wk-card px-3 py-2"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-condensed text-[13px] font-bold tracking-[0.06em] text-free">
                    {new Date(log.finishedAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-condensed text-xs tracking-[0.04em] text-wk-muted">
                    {log.exercises.length} EJERCICIOS ·{" "}
                    {log.exercises.reduce((acc, ex) => acc + ex.sets, 0)} SERIES
                  </span>
                </div>
                <div className="mt-0.5 font-condensed text-[11px] uppercase tracking-[0.04em] text-wk-faint">
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
