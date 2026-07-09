import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import {
  JazzReactProvider,
  useAccount,
  usePassphraseAuth,
} from "jazz-tools/react";
import { wordlist } from "@scure/bip39/wordlists/spanish.js";
import {
  WorkoutAccount,
  createRoutineState,
  legacyRoutineId,
  loadLegacyRoutine,
} from "./schema/Workout";

const SYNC_PEER =
  "wss://cloud.jazz.tools/?key=workout-tracker@danielo515.github.io";

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

const workoutDataC: WorkoutDay[] = [
  {
    id: 1,
    label: "DÍA 1",
    title: "ESPALDA Y HOMBRO POST",
    color: "#00E5FF",
    restNote: "1' entre series",
    groups: [
      {
        name: "ESPALDA",
        supersets: false,
        exercises: [
          { id: "c1-1", name: "REMO ANCHO GIRONDA AL DIAFRAGMA", sets: 4, reps: "10 (+1x15)" },
          { id: "c1-2", name: "REMO EN PUNTA", sets: 5, reps: "6 (+2x12)" },
          { id: "c1-3", name: "JALÓN ANCHO AL PECHO", sets: 4, reps: "10 (+2 DESC)" },
          { id: "c1-4", name: "PULLOVER MANC ATRAVESADO EN BANCO", sets: 3, reps: "12" },
        ],
      },
      {
        name: "HOMBRO POSTERIOR",
        supersets: true,
        exercises: [
          {
            id: "c1-5",
            name: "PÁJAROS MANCUERNAS",
            pairedWith: "PESO MUERTO MANC",
            pairedId: "c1-5b",
            sets: 4,
            reps: "12",
            repsB: "8",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "DÍA 2",
    title: "PECHO Y LATERAL",
    color: "#FF6B35",
    restNote: "1' entre series",
    groups: [
      {
        name: "PECHO",
        supersets: false,
        exercises: [
          { id: "c2-1", name: "SUPERIOR MANCUERNAS", sets: 4, reps: "8 (+2 DESC)" },
          { id: "c2-2", name: "APERTURAS SUPERIORES", sets: 4, reps: "12" },
          { id: "c2-3", name: "PRESS PLANO MULTIPOWER", sets: 4, reps: "8" },
          { id: "c2-4", name: "CRUCES", sets: 4, reps: "12" },
        ],
      },
      {
        name: "HOMBRO LATERAL",
        supersets: false,
        exercises: [
          { id: "c2-5", name: "ELEVACIONES LATERALES EN MÁQUINA", sets: 4, reps: "15" },
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
            id: "c3-1",
            name: "EXTENSIONES",
            pairedWith: "PESO MUERTO MULTIPOWER",
            pairedId: "c3-1b",
            sets: 4,
            reps: "15",
            repsB: "12",
          },
          {
            id: "c3-2",
            name: "SISSY",
            pairedWith: "FEMORAL TUMBADO",
            pairedId: "c3-2b",
            sets: 4,
            reps: "15",
            repsB: "10",
          },
        ],
      },
      {
        name: "PIERNA",
        supersets: false,
        exercises: [
          { id: "c3-3", name: "PÉNDULO", sets: 5, reps: "12 (+2x20)" },
          { id: "c3-4", name: "ZANCADA LARGA PESADA", sets: 3, reps: "12" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "DÍA 4",
    title: "BÍCEPS Y TRÍCEPS",
    color: "#FFD23D",
    restNote: "1' entre series",
    groups: [
      {
        name: "BÍCEPS",
        supersets: false,
        exercises: [
          { id: "c4-1", name: "ALTERNO DE PIE", sets: 5, reps: "6 (+2x12)" },
          { id: "c4-2", name: "PREDICADOR Z", sets: 6, reps: "6 CERR (+3x12 ABIERT)" },
        ],
      },
      {
        name: "TRÍCEPS",
        supersets: false,
        exercises: [
          { id: "c4-3", name: "POLEA V EN GIRONDA", sets: 4, reps: "12 (+2 DESC)" },
          { id: "c4-4", name: "FONDOS PARALELAS", sets: 4, reps: "FALLO" },
          { id: "c4-5", name: "POLEA CUERDA", sets: 3, reps: "20" },
        ],
      },
      {
        name: "ANTEBRAZO",
        supersets: false,
        exercises: [
          { id: "c4-6", name: "ANTEBRAZO POR DETRÁS CON BARRA", sets: 4, reps: "20 MÍN" },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "DÍA 5",
    title: "HOMBRO",
    color: "#CF6BFF",
    restNote: "1' entre series",
    groups: [
      {
        name: "HOMBRO",
        supersets: false,
        exercises: [
          { id: "c5-1", name: "REMO ANCHO AL CUELLO", sets: 3, reps: "12" },
          { id: "c5-2", name: "PRESS HAMMER", sets: 5, reps: "8 (+1x15)" },
          { id: "c5-3", name: "TRAS NUCA MULTIPOWER", sets: 3, reps: "12 LIGERAS" },
          { id: "c5-4", name: "LATERALES EN POLEA", sets: 3, reps: "12 SIN DESCANSO" },
        ],
      },
      {
        name: "SUPERSERIE",
        supersets: true,
        exercises: [
          {
            id: "c5-5",
            name: "LATERAL DE PIE",
            pairedWith: "FRONTALES MANC",
            pairedId: "c5-5b",
            sets: 4,
            reps: "8-12",
            repsB: "8-12",
          },
        ],
      },
    ],
  },
];

const weeklyExercisesC: WeeklyExercise[] = [
  { id: "wc-1", name: "ENCOGIMIENTOS EN POLEA", sets: 4, reps: "20", timesPerWeek: 2 },
  { id: "wc-2", name: "ELEVACIÓN DE PIERNAS", sets: 4, reps: "FALLO", timesPerWeek: 2 },
];

const workoutDataD: WorkoutDay[] = [
  {
    id: 1,
    label: "DÍA 1",
    title: "ESPALDA Y ANTEBRAZO",
    color: "#00E5FF",
    restNote: "1' entre series",
    groups: [
      {
        name: "ESPALDA",
        supersets: true,
        exercises: [
          {
            id: "d1-1",
            name: "PULLOVER CUERDA",
            pairedWith: "INVERTIDO AL PECHO",
            pairedId: "d1-1b",
            sets: 3,
            reps: "12",
            repsB: "12",
          },
        ],
      },
      {
        name: "ESPALDA",
        supersets: false,
        exercises: [
          { id: "d1-2", name: "JALÓN ANCHO AL PECHO", sets: 5, reps: "6 (+2x12)" },
          { id: "d1-3", name: "REMO MANCUERNA SUPINO", sets: 4, reps: "8" },
        ],
      },
      {
        name: "ESPALDA",
        supersets: true,
        exercises: [
          {
            id: "d1-4",
            name: "REMO EN PUNTA",
            pairedWith: "REMO EN BANCO A DOS MANOS",
            pairedId: "d1-4b",
            sets: 4,
            reps: "8",
            repsB: "12",
          },
        ],
      },
      {
        name: "LUMBAR Y ANTEBRAZO",
        supersets: false,
        exercises: [
          {
            id: "d1-5",
            name: "HIPEREXTENSIONES",
            sets: 3,
            reps: "FALLO (SIN PESO Y LENTAS)",
          },
          {
            id: "d1-6",
            name: "SUPINACIÓN Y PRONACIÓN MUÑECA",
            sets: 4,
            reps: "20",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "DÍA 2",
    title: "HOMBRO",
    color: "#CF6BFF",
    restNote: "1' entre series",
    groups: [
      {
        name: "HOMBRO",
        supersets: false,
        exercises: [
          { id: "d2-1", name: "MILITAR POR DELANTE", sets: 6, reps: "8 (+2 DESC)" },
          { id: "d2-2", name: "PRESS HAMMER", sets: 3, reps: "20" },
          { id: "d2-3", name: "LATERALES DE PIE", sets: 6, reps: "6 (+3x12)" },
          { id: "d2-4", name: "REMO ANCHO AL CUELLO", sets: 3, reps: "12" },
        ],
      },
      {
        name: "HOMBRO",
        supersets: true,
        exercises: [
          {
            id: "d2-5",
            name: "PÁJAROS MANCUERNAS",
            pairedWith: "ENCOGIMIENTOS",
            pairedId: "d2-5b",
            sets: 4,
            reps: "12",
            repsB: "15",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "DÍA 3",
    title: "PIERNA",
    color: "#B8FF3D",
    restNote: "1' entre series",
    groups: [
      {
        name: "PIERNA",
        supersets: false,
        exercises: [
          { id: "d3-1", name: "HACK", sets: 6, reps: "12 (+2x20)" },
          {
            id: "d3-2",
            name: "PRENSA A UNA PIERNA",
            sets: 3,
            reps: "12 SIN DESCANSO",
          },
          { id: "d3-3", name: "PRENSA", sets: 4, reps: "12" },
          { id: "d3-4", name: "EXTENSIONES", sets: 4, reps: "15" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "DÍA 4",
    title: "PECHO Y TRÍCEPS",
    color: "#FF6B35",
    restNote: "1' entre series",
    groups: [
      {
        name: "PECHO",
        supersets: false,
        exercises: [
          { id: "d4-1", name: "PLANO MULTIPOWER", sets: 6, reps: "6 (+3x12)" },
        ],
      },
      {
        name: "PECHO",
        supersets: true,
        exercises: [
          {
            id: "d4-2",
            name: "APERTURAS SUPERIORES",
            pairedWith: "PRESS SUPERIOR",
            pairedId: "d4-2b",
            sets: 4,
            reps: "10",
            repsB: "6",
          },
        ],
      },
      {
        name: "TRÍCEPS",
        supersets: true,
        exercises: [
          {
            id: "d4-3",
            name: "CRUCES EN POLEA",
            pairedWith: "PRESS CERRADO TRÍCEPS",
            pairedId: "d4-3b",
            sets: 4,
            reps: "12",
            repsB: "12",
          },
          {
            id: "d4-4",
            name: "POLEA V",
            pairedWith: "FONDOS PARALELAS TRÍCEPS",
            pairedId: "d4-4b",
            sets: 4,
            reps: "15",
            repsB: "FALLO",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "DÍA 5",
    title: "FEMORAL Y BÍCEPS",
    color: "#FFD23D",
    restNote: "1' entre series",
    groups: [
      {
        name: "FEMORAL",
        supersets: false,
        exercises: [
          {
            id: "d5-1",
            name: "FEMORAL TUMBADO",
            sets: 6,
            reps: "6 (+2x10 +2x15)",
          },
          { id: "d5-2", name: "ABDUCTOR", sets: 4, reps: "8-15" },
          {
            id: "d5-3",
            name: "FEMORAL A UNA PIERNA",
            sets: 5,
            reps: "8 (+3x12) SIN DESCANSO",
          },
        ],
      },
      {
        name: "BÍCEPS",
        supersets: false,
        exercises: [
          {
            id: "d5-4",
            name: "ALTERNO SENTADO",
            sets: 6,
            reps: "8 (+2x12 A DOS MANOS)",
          },
          { id: "d5-5", name: "CURL BARRA RECTA", sets: 5, reps: "6 (+2x12)" },
        ],
      },
    ],
  },
];

const weeklyExercisesD: WeeklyExercise[] = [
  { id: "wd-1", name: "ENCOGIMIENTOS EN POLEA", sets: 4, reps: "20", timesPerWeek: 2 },
  { id: "wd-2", name: "ELEVACIÓN DE PIERNAS", sets: 4, reps: "FALLO", timesPerWeek: 2 },
  { id: "wd-3", name: "GEMELO EN PRENSA", sets: 4, reps: "20", timesPerWeek: 2 },
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
  {
    id: "c",
    name: "RUTINA C",
    workoutData: workoutDataC,
    weeklyExercises: weeklyExercisesC,
    notes: [
      "TODOS LOS DÍAS TRAS LAS PESAS: 10' DE CARDIO HIT + 10' DE LISS",
      "DOS DÍAS EN SEMANA: ABDOMEN (incluido en ejercicios semanales)",
    ],
  },
  {
    id: "d",
    name: "RUTINA D",
    workoutData: workoutDataD,
    weeklyExercises: weeklyExercisesD,
    notes: [
      "TODOS LOS DÍAS TRAS LAS PESAS: 10' DE CARDIO HIT + 10' DE LISS",
      "DOS DÍAS EN SEMANA: ABDOMEN Y GEMELO EN PRENSA (incluido en ejercicios semanales)",
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

const ROUTINE_IDS = ["a", "b", "c", "d"];

function WorkoutTracker() {
  const me = useAccount(WorkoutAccount, {
    resolve: {
      root: { routines: { $each: { completed: true, weekHistory: true } } },
    },
  });
  const { secondsLeft, running, start, stop } = useRestTimer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-runs when the active account changes (e.g. after logging in with a
  // recovery phrase), so a freshly switched-to account is seeded too.
  const accountId = me.$isLoaded ? me.$jazz.id : null;

  // Seed any missing routine state from the pre-Jazz localStorage data.
  useEffect(() => {
    if (!me.$isLoaded) return;
    const root = me.root;
    const wasEmpty = ROUTINE_IDS.every((id) => !root.routines.$jazz.has(id));
    for (const rid of ROUTINE_IDS) {
      if (!root.routines.$jazz.has(rid)) {
        root.routines.$jazz.set(rid, createRoutineState(loadLegacyRoutine(rid)));
      }
    }
    if (wasEmpty) {
      const legacy = legacyRoutineId();
      if (legacy && ROUTINE_IDS.includes(legacy)) {
        root.$jazz.set("activeRoutineId", legacy);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  if (!me.$isLoaded) {
    if (me.$jazz.loadingState === "unauthorized")
      return <LoadingScreen message="No tienes acceso a esta cuenta." />;
    if (me.$jazz.loadingState === "unavailable")
      return <LoadingScreen message="No se pudo cargar tu cuenta." />;
    return <LoadingScreen />;
  }

  const appRoot = me.root;
  const activeRoutineId = appRoot.activeRoutineId;
  const routineState = appRoot.routines[activeRoutineId];
  if (!routineState?.$isLoaded) return <LoadingScreen />;

  const routine =
    routines.find((r) => r.id === activeRoutineId) ??
    routines[routines.length - 1]!;
  const workoutData = routine.workoutData;
  const weeklyExercises = routine.weeklyExercises;

  const completed = routineState.completed;
  const weekHistory = routineState.weekHistory;
  const activeDay = Math.max(
    0,
    Math.min(routineState.activeDay, workoutData.length - 1),
  );

  const setActiveDay = (i: number) => routineState.$jazz.set("activeDay", i);

  const switchRoutine = (newId: string) => {
    if (!appRoot.routines.$jazz.has(newId)) {
      appRoot.routines.$jazz.set(
        newId,
        createRoutineState({ activeDay: 0, completed: {}, weekHistory: [] }),
      );
    }
    appRoot.$jazz.set("activeRoutineId", newId);
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const day = workoutData[activeDay]!;

  const handleSetDone = (exerciseId: string, setNum: number) => {
    const current = completed[exerciseId] ?? 0;
    const newVal = current === setNum ? setNum - 1 : setNum;
    completed.$jazz.set(exerciseId, newVal);
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
    day.groups
      .flatMap((g) => g.exercises.map((e) => e.id))
      .forEach((id) => completed.$jazz.delete(id));
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
    weekHistory.$jazz.push(Date.now());
    Object.keys(completed).forEach((key) => completed.$jazz.delete(key));
    routineState.$jazz.set("activeDay", 0);
  };

  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      activeDay,
      completed: { ...completed },
      weekHistory: [...weekHistory],
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
        if (data.completed && typeof data.completed === "object") {
          Object.keys(completed).forEach((key) => completed.$jazz.delete(key));
          for (const [key, value] of Object.entries(data.completed)) {
            if (key === "__proto__" || key === "constructor") continue;
            const num = Number(value);
            if (!Number.isFinite(num)) continue;
            completed.$jazz.set(key, num);
          }
        }
        if (Array.isArray(data.weekHistory)) {
          const ts = data.weekHistory
            .map(Number)
            .filter((n: number) => Number.isFinite(n));
          weekHistory.$jazz.splice(0, weekHistory.length, ...ts);
        }
        if (
          typeof data.activeDay === "number" &&
          Number.isFinite(data.activeDay)
        ) {
          routineState.$jazz.set("activeDay", data.activeDay);
        }
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

      {/* Sync */}
      <SyncPanel color={day.color} />

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

// ─── LOADING ─────────────────────────────────────────────────────────────────

function LoadingScreen({ message = "Cargando…" }: { message?: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 13,
          letterSpacing: "0.14em",
          color: "#444",
          textTransform: "uppercase",
        }}
      >
        {message}
      </span>
    </div>
  );
}

// ─── SYNC PANEL ──────────────────────────────────────────────────────────────

function SyncPanel({ color }: { color: string }) {
  const auth = usePassphraseAuth({ wordlist });
  const [showPhrase, setShowPhrase] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginPhrase, setLoginPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const signedIn = auth.state === "signedIn";

  const enableSync = async () => {
    setBusy(true);
    setError("");
    try {
      await auth.signUp();
      setShowPhrase(true);
    } catch {
      setError("No se pudo activar la sincronización. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const logIn = async () => {
    const phrase = loginPhrase.trim().replace(/\s+/g, " ");
    if (!phrase) return;
    setBusy(true);
    setError("");
    try {
      await auth.logIn(phrase);
      setShowLogin(false);
      setLoginPhrase("");
    } catch {
      setError("La frase no es válida. Revísala e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(auth.passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const sectionLabel: CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    color: "#444",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: 8,
  };
  const bodyText: CSSProperties = {
    fontFamily: "'Barlow', sans-serif",
    fontSize: 12,
    color: "#888",
    lineHeight: 1.5,
  };
  const primaryBtn: CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    width: "100%",
    padding: "11px 14px",
    background: busy ? "#1a1a1a" : color,
    color: busy ? "#444" : "#000",
    border: `1px solid ${busy ? "#222" : color}`,
    borderRadius: 6,
    cursor: busy ? "default" : "pointer",
  };
  const ghostBtn: CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: "transparent",
    color: "#666",
    border: "none",
    padding: "8px 0 0",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "16px 20px 0" }}>
      <div style={sectionLabel}>Sincronización</div>
      <div
        style={{
          background: "#111",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {signedIn ? (
          <>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#22c55e",
                textTransform: "uppercase",
              }}
            >
              ✓ Sincronización activa
            </div>
            <div style={bodyText}>
              Tu progreso se sincroniza entre tus dispositivos.
            </div>
            <button
              type="button"
              style={ghostBtn}
              onClick={() => setShowPhrase((v) => !v)}
            >
              {showPhrase ? "Ocultar frase" : "Ver frase de recuperación"}
            </button>
          </>
        ) : (
          <>
            <div style={bodyText}>
              Tus datos se guardan solo en este dispositivo. Activa la
              sincronización para acceder a tu progreso desde otros
              dispositivos.
            </div>
            <button
              type="button"
              style={primaryBtn}
              disabled={busy}
              onClick={enableSync}
            >
              {busy ? "Activando…" : "Activar sincronización"}
            </button>
            <button
              type="button"
              style={ghostBtn}
              onClick={() => {
                setShowLogin((v) => !v);
                setError("");
              }}
            >
              {showLogin ? "Cancelar" : "Ya tengo una frase de recuperación"}
            </button>
            {showLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={loginPhrase}
                  onChange={(e) => setLoginPhrase(e.target.value)}
                  placeholder="Escribe aquí tu frase de recuperación"
                  rows={3}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="off"
                  style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: 13,
                    color: "#fff",
                    background: "#0a0a0a",
                    border: "1px solid #222",
                    borderRadius: 6,
                    padding: "8px 10px",
                    resize: "vertical",
                  }}
                />
                <button
                  type="button"
                  style={primaryBtn}
                  disabled={busy || !loginPhrase.trim()}
                  onClick={logIn}
                >
                  {busy ? "Entrando…" : "Entrar"}
                </button>
              </div>
            )}
          </>
        )}

        {showPhrase && signedIn && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 14,
                color: "#fff",
                lineHeight: 1.6,
                background: "#0a0a0a",
                border: `1px solid ${color}44`,
                borderRadius: 6,
                padding: "10px 12px",
                wordSpacing: "0.15em",
              }}
            >
              {auth.passphrase}
            </div>
            <button type="button" style={primaryBtn} onClick={copyPhrase}>
              {copied ? "✓ Copiada" : "Copiar frase"}
            </button>
            <div style={{ ...bodyText, color: "#666", fontSize: 11 }}>
              Guárdala en un lugar seguro. La necesitarás para acceder a tu
              progreso desde otro dispositivo.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 12,
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT (Jazz provider) ────────────────────────────────────────────────────

export default function WorkoutApp() {
  return (
    <JazzReactProvider
      sync={{ peer: SYNC_PEER }}
      AccountSchema={WorkoutAccount}
      fallback={<LoadingScreen />}
    >
      <WorkoutTracker />
    </JazzReactProvider>
  );
}
