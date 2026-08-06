import { describe, it, expect } from "vitest";
import { parseRoutineJson, decodeRoutine } from "./routine";

// Compositional builders: each returns a plain JSON object with sensible
// defaults that can be overridden per test. Kept loosely typed on purpose —
// the schema receives `unknown` and these are the inputs under test.
type Json = Record<string, unknown>;

const exercise = (o: Json = {}): Json => ({
  id: "d1-1",
  name: "PRESS BANCA",
  sets: 4,
  reps: "8",
  ...o,
});

const group = (o: Json = {}): Json => ({
  name: "PECHO",
  supersets: false,
  exercises: [exercise()],
  ...o,
});

const day = (o: Json = {}): Json => ({
  id: 1,
  label: "DÍA 1",
  title: "EMPUJE",
  color: "#00E5FF",
  restNote: '90" entre series',
  groups: [group()],
  ...o,
});

const routine = (o: Json = {}): Json => ({
  id: "fuerza-2026",
  name: "RUTINA FUERZA",
  workoutData: [day()],
  weeklyExercises: [],
  notes: [],
  ...o,
});

const errorsOf = (value: unknown): string[] => {
  const result = decodeRoutine(value);
  if (result.ok) throw new Error("expected decoding to fail but it succeeded");
  return result.errors;
};

describe("parseRoutineJson", () => {
  it("accepts a valid routine", () => {
    const result = parseRoutineJson(JSON.stringify(routine()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routine.id).toBe("fuerza-2026");
      expect(result.routine.workoutData).toHaveLength(1);
    }
  });

  it("defaults weeklyExercises and notes to empty arrays when omitted", () => {
    const result = decodeRoutine({
      id: "fuerza-2026",
      name: "RUTINA FUERZA",
      workoutData: [day()],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routine.weeklyExercises).toEqual([]);
      expect(result.routine.notes).toEqual([]);
    }
  });

  it("accepts a valid superset (all three paired fields)", () => {
    const supersetGroup = group({
      supersets: true,
      exercises: [
        exercise({ pairedWith: "FONDOS", pairedId: "d1-1b", repsB: "FALLO" }),
      ],
    });
    const result = decodeRoutine(
      routine({ workoutData: [day({ groups: [supersetGroup] })] }),
    );
    expect(result.ok).toBe(true);
  });

  it("reports an explicit error for empty input", () => {
    const result = parseRoutineJson("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("Pega el JSON");
  });

  it("reports an explicit error for non-JSON text", () => {
    const result = parseRoutineJson("esto no es json {");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("no es JSON válido");
  });
});

describe("decodeRoutine validation errors", () => {
  it("rejects an empty name", () => {
    expect(errorsOf(routine({ name: "" })).join("\n")).toContain(
      "no puede estar vacío",
    );
  });

  it("rejects a reserved routine id", () => {
    expect(errorsOf(routine({ id: "a" })).join("\n")).toContain("reservado");
  });

  it("rejects sets that are not greater than 0", () => {
    const broken = routine({
      workoutData: [day({ groups: [group({ exercises: [exercise({ sets: 0 })] })] })],
    });
    expect(errorsOf(broken).join("\n")).toContain("debe ser mayor que 0");
  });

  it("rejects non-integer sets", () => {
    const broken = routine({
      workoutData: [day({ groups: [group({ exercises: [exercise({ sets: 2.5 })] })] })],
    });
    expect(errorsOf(broken).join("\n")).toContain("entero");
  });

  it("rejects an invalid hex color", () => {
    expect(
      errorsOf(routine({ workoutData: [day({ color: "azul" })] })).join("\n"),
    ).toContain("hexadecimal");
  });

  it("rejects a day with no groups", () => {
    expect(
      errorsOf(routine({ workoutData: [day({ groups: [] })] })).join("\n"),
    ).toContain("al menos un grupo");
  });

  it("rejects a routine with no days", () => {
    expect(errorsOf(routine({ workoutData: [] })).join("\n")).toContain(
      "al menos un día",
    );
  });

  it("rejects duplicate exercise ids", () => {
    const broken = routine({
      workoutData: [
        day({ groups: [group({ exercises: [exercise(), exercise()] })] }),
      ],
    });
    expect(errorsOf(broken).join("\n")).toContain("duplicados");
  });

  it("rejects a partial superset (only some paired fields)", () => {
    const broken = routine({
      workoutData: [
        day({ groups: [group({ exercises: [exercise({ pairedWith: "FONDOS" })] })] }),
      ],
    });
    expect(errorsOf(broken).join("\n")).toContain("superserie necesita");
  });

  it("reports the field path in the error", () => {
    expect(
      errorsOf(routine({ workoutData: [day({ title: "" })] })).join("\n"),
    ).toContain("title");
  });

  it("collects every error at once (errors: all)", () => {
    const broken = routine({
      name: "",
      workoutData: [
        day({ color: "nope", groups: [group({ exercises: [exercise({ sets: 0 })] })] }),
      ],
    });
    expect(errorsOf(broken).length).toBeGreaterThanOrEqual(3);
  });
});
