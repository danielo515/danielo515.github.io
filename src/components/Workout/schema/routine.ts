import { Schema, ParseResult, Either } from "effect";

// ─── EFFECT SCHEMA: ROUTINE DEFINITION ───────────────────────────────────────
// Validates a routine pasted as JSON before it is stored. Every constraint
// carries an explicit Spanish message, and types carry `description` +
// `examples` annotations so the errors surfaced to the user are easy to
// understand.
//
// The shape mirrors the `WorkoutRoutine` interface used by the tracker:
//   routine -> workoutData[] (days) -> groups[] -> exercises[]
//             -> weeklyExercises[]
//             -> notes[]

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

// Native non-empty string schema with a Spanish message.
const NonEmptyString = Schema.NonEmptyString.annotations({
  message: () => "no puede estar vacío",
});

const PositiveInt = Schema.Number.pipe(
  Schema.int({ message: () => "debe ser un número entero (sin decimales)" }),
  Schema.positive({ message: () => "debe ser mayor que 0" }),
).annotations({ description: "Número entero mayor que 0", examples: [3, 4] });

const HexColor = Schema.String.pipe(
  Schema.pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: () => "debe ser un color hexadecimal de 3 o 6 dígitos",
  }),
).annotations({
  description: "Color hexadecimal usado como acento del día",
  examples: ["#00E5FF", "#FFD600", "#FF6B6B"],
});

const Reps = NonEmptyString.annotations({
  description: "Repeticiones como texto: número, rango o palabra",
  examples: ["12", "8-10", "FALLO", "30 seg"],
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
    examples: ["d1-1", "d1-2"],
  }),
  name: NonEmptyString.annotations({
    description: "Nombre del ejercicio",
    examples: ["PRESS BANCA", "JALÓN AL PECHO"],
  }),
  sets: PositiveInt.annotations({ description: "Número de series" }),
  reps: Reps,
  pairedWith: Schema.optional(NonEmptyString).annotations({
    description: "Superserie: nombre del segundo ejercicio emparejado",
    examples: ["FONDOS"],
  }),
  pairedId: Schema.optional(NonEmptyString).annotations({
    description: "Superserie: id único del segundo ejercicio emparejado",
    examples: ["d1-1b"],
  }),
  repsB: Schema.optional(NonEmptyString).annotations({
    description: "Superserie: repeticiones del segundo ejercicio emparejado",
    examples: ["10", "FALLO"],
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
    description: "Nombre del grupo muscular",
    examples: ["ESPALDA", "PECHO", "PIERNA"],
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
  ).annotations({
    description: "Identificador numérico del día",
    examples: [1, 2, 3],
  }),
  label: NonEmptyString.annotations({
    description: "Etiqueta corta del día",
    examples: ["DÍA 1", "DÍA 2"],
  }),
  title: NonEmptyString.annotations({
    description: "Título del día, normalmente el foco muscular",
    examples: ["ESPALDA", "EMPUJE"],
  }),
  color: HexColor,
  restNote: Schema.String.annotations({
    description: "Nota de descanso (puede ir vacía)",
    examples: ["1' entre series", '90" entre series', ""],
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
    examples: ["w-1", "w-2"],
  }),
  name: NonEmptyString.annotations({ examples: ["ABDOMINALES"] }),
  sets: PositiveInt,
  reps: Reps,
  timesPerWeek: PositiveInt.annotations({
    description: "Veces por semana que se realiza el ejercicio",
    examples: [2, 3],
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
    description: "Identificador único de la rutina",
    examples: ["fuerza-2026", "hipertrofia-verano"],
  }),
  name: NonEmptyString.annotations({
    description: "Nombre visible de la rutina",
    examples: ["RUTINA FUERZA"],
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
      const ids = [
        ...routine.workoutData.flatMap((day) =>
          day.groups.flatMap((group) =>
            group.exercises.flatMap((ex) =>
              ex.pairedId !== undefined ? [ex.id, ex.pairedId] : [ex.id],
            ),
          ),
        ),
        ...routine.weeklyExercises.map((ex) => ex.id),
      ];
      const dupes = [
        ...new Set(ids.filter((id, index) => ids.indexOf(id) !== index)),
      ];
      if (dupes.length === 0) return true;
      return {
        path: [],
        message: `hay ids de ejercicio duplicados: ${dupes
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
export type DecodedExercise = Schema.Schema.Type<typeof Exercise>;

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
