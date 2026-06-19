import { Schema, ParseResult, Either } from "effect";

// ─── EFFECT SCHEMA: ROUTINE DEFINITION ───────────────────────────────────────
// Validates a routine pasted as JSON before it is stored. Every constraint
// carries an explicit Spanish message and every type carries a description so
// the errors surfaced to the user are easy to understand.
//
// The shape mirrors the `WorkoutRoutine` interface used by the tracker:
//   routine -> workoutData[] (days) -> groups[] -> exercises[]
//             -> weeklyExercises[]
//             -> notes[]

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

const NonEmptyString = Schema.String.pipe(
  Schema.minLength(1, { message: () => "no puede estar vacío" }),
);

const PositiveInt = Schema.Number.pipe(
  Schema.int({ message: () => "debe ser un número entero (sin decimales)" }),
  Schema.positive({ message: () => "debe ser mayor que 0" }),
).annotations({ description: "Número entero mayor que 0" });

const HexColor = Schema.String.pipe(
  Schema.pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: () =>
      'debe ser un color hexadecimal de 3 o 6 dígitos, p. ej. "#00E5FF"',
  }),
).annotations({
  description: 'Color hexadecimal usado como acento del día, p. ej. "#00E5FF"',
});

const Reps = NonEmptyString.annotations({
  description:
    'Repeticiones como texto: número ("12"), rango ("8-10") o palabra ("FALLO")',
});

// Reserved ids belong to the built-in routines and must not be reused. The app
// also re-checks collisions against the live built-in list when adding.
const RESERVED_ROUTINE_IDS = ["a", "b", "c", "d"];

// ─── EXERCISE ────────────────────────────────────────────────────────────────
// A normal exercise. It becomes a superset when the three "paired*" fields are
// provided together; providing only some of them is rejected.

const Exercise = Schema.Struct({
  id: NonEmptyString.annotations({
    description: "Identificador único del ejercicio dentro de la rutina",
  }),
  name: NonEmptyString.annotations({ description: "Nombre del ejercicio" }),
  sets: PositiveInt.annotations({ description: "Número de series" }),
  reps: Reps,
  pairedWith: Schema.optional(NonEmptyString).annotations({
    description: "Superserie: nombre del segundo ejercicio emparejado",
  }),
  pairedId: Schema.optional(NonEmptyString).annotations({
    description: "Superserie: id único del segundo ejercicio emparejado",
  }),
  repsB: Schema.optional(NonEmptyString).annotations({
    description: "Superserie: repeticiones del segundo ejercicio emparejado",
  }),
})
  .pipe(
    Schema.filter((ex) => {
      const provided = [ex.pairedWith, ex.pairedId, ex.repsB].filter(
        (v) => v !== undefined,
      ).length;
      if (provided === 0 || provided === 3) return true;
      return {
        path: [],
        message:
          'una superserie necesita los tres campos juntos ("pairedWith", "pairedId" y "repsB"), o ninguno de ellos',
      };
    }),
  )
  .annotations({
    identifier: "Ejercicio",
    description:
      "Ejercicio individual; opcionalmente una superserie con un segundo ejercicio emparejado",
  });

// ─── GROUP ───────────────────────────────────────────────────────────────────

const ExerciseGroup = Schema.Struct({
  name: NonEmptyString.annotations({
    description: 'Nombre del grupo muscular, p. ej. "ESPALDA"',
  }),
  supersets: Schema.Boolean.annotations({
    description: "Indica si el grupo se entrena como superseries",
  }),
  exercises: Schema.Array(Exercise).pipe(
    Schema.minItems(1, {
      message: () => "el grupo debe tener al menos un ejercicio",
    }),
  ),
}).annotations({ identifier: "Grupo" });

// ─── DAY ─────────────────────────────────────────────────────────────────────

const WorkoutDay = Schema.Struct({
  id: Schema.Number.pipe(
    Schema.int({ message: () => "debe ser un número entero" }),
  ).annotations({ description: "Identificador numérico del día" }),
  label: NonEmptyString.annotations({
    description: 'Etiqueta corta del día, p. ej. "DÍA 1"',
  }),
  title: NonEmptyString.annotations({
    description: 'Título del día, normalmente el foco muscular, p. ej. "ESPALDA"',
  }),
  color: HexColor,
  restNote: Schema.String.annotations({
    description: 'Nota de descanso, p. ej. "1\' entre series" (puede ir vacía)',
  }),
  groups: Schema.Array(ExerciseGroup).pipe(
    Schema.minItems(1, {
      message: () => "el día debe tener al menos un grupo de ejercicios",
    }),
  ),
}).annotations({ identifier: "Día" });

// ─── WEEKLY EXERCISE ─────────────────────────────────────────────────────────

const WeeklyExercise = Schema.Struct({
  id: NonEmptyString.annotations({
    description: "Identificador único del ejercicio semanal",
  }),
  name: NonEmptyString,
  sets: PositiveInt,
  reps: Reps,
  timesPerWeek: PositiveInt.annotations({
    description: "Veces por semana que se realiza el ejercicio",
  }),
}).annotations({ identifier: "EjercicioSemanal" });

// ─── ROUTINE ─────────────────────────────────────────────────────────────────

const Routine = Schema.Struct({
  id: NonEmptyString.pipe(
    Schema.filter((id) =>
      RESERVED_ROUTINE_IDS.includes(id)
        ? {
            path: [],
            message: `el id "${id}" está reservado para las rutinas integradas (${RESERVED_ROUTINE_IDS.join(", ")}); elige otro distinto`,
          }
        : true,
    ),
  ).annotations({
    description: 'Identificador único de la rutina, p. ej. "fuerza-2026"',
  }),
  name: NonEmptyString.annotations({
    description: 'Nombre visible de la rutina, p. ej. "RUTINA FUERZA"',
  }),
  workoutData: Schema.Array(WorkoutDay).pipe(
    Schema.minItems(1, {
      message: () => "la rutina debe tener al menos un día de entrenamiento",
    }),
  ),
  weeklyExercises: Schema.optionalWith(Schema.Array(WeeklyExercise), {
    default: () => [],
  }).annotations({
    description: "Ejercicios que se hacen X veces por semana (opcional)",
  }),
  notes: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }).annotations({ description: "Notas de la rutina (opcional)" }),
})
  .pipe(
    Schema.filter((routine) => {
      // Every exercise id (including the paired ids of supersets and the
      // weekly exercises) must be unique: completion progress is tracked by id.
      const ids: string[] = [];
      for (const day of routine.workoutData) {
        for (const group of day.groups) {
          for (const ex of group.exercises) {
            ids.push(ex.id);
            if (ex.pairedId !== undefined) ids.push(ex.pairedId);
          }
        }
      }
      for (const ex of routine.weeklyExercises) ids.push(ex.id);

      const seen = new Set<string>();
      const dupes = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) dupes.add(id);
        seen.add(id);
      }
      if (dupes.size === 0) return true;
      return {
        path: [],
        message: `hay ids de ejercicio duplicados: ${[...dupes]
          .map((d) => `"${d}"`)
          .join(", ")}. Cada ejercicio debe tener un id único en toda la rutina`,
      };
    }),
  )
  .annotations({
    identifier: "Rutina",
    title: "Rutina de entrenamiento",
    description:
      "Rutina completa: días de entrenamiento, ejercicios semanales y notas",
  });

export const RoutineSchema = Routine;

export type DecodedRoutine = Schema.Schema.Type<typeof Routine>;

// ─── DECODING ────────────────────────────────────────────────────────────────

export type DecodeResult =
  | { ok: true; routine: DecodedRoutine }
  | { ok: false; errors: string[] };

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) return "(rutina)";
  return path.map((segment) => String(segment)).join(" → ");
}

/** Validate an already-parsed value against the routine schema. */
export function decodeRoutine(value: unknown): DecodeResult {
  const result = Schema.decodeUnknownEither(Routine, { errors: "all" })(value);
  if (Either.isRight(result)) return { ok: true, routine: result.right };

  const errors = ParseResult.ArrayFormatter.formatErrorSync(result.left).map(
    (issue) => `${formatPath(issue.path)}: ${issue.message}`,
  );
  return {
    ok: false,
    errors: errors.length > 0 ? errors : ["El JSON no es una rutina válida."],
  };
}

/** Parse a JSON string and validate it as a routine. */
export function parseRoutineJson(text: string): DecodeResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, errors: ["Pega el JSON de la rutina antes de validar."] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`El texto no es JSON válido: ${detail}`] };
  }
  return decodeRoutine(parsed);
}
