---
name: workout-routine-json
description: >-
  Convert a workout/training routine described in natural language (in any
  language) into the exact JSON the Workout Tracker app accepts when you paste a
  routine in the "AÑADIR RUTINA" panel. Use this whenever the user provides a
  routine as text, a photo/screenshot description, a PDF, or a spreadsheet dump
  and wants it turned into importable JSON. The skill documents the full schema,
  every validation rule, and — importantly — which training concepts are and are
  NOT representable, so you can tell the user what was dropped.
---

# Workout routine → JSON

The Workout Tracker (`/workout`) lets you add a custom routine by pasting a JSON
object. That JSON is validated with a strict Effect schema
(`src/components/Workout/schema/routine.ts`): if anything is wrong it is
rejected with an explicit error. Your job is to produce JSON that validates on
the first try, and to be honest with the user about anything in their routine
that this format cannot express.

## Golden rules

1. **Output only one JSON object**, matching the schema below. No comments, no
   trailing commas, no markdown fences inside the value the user will paste.
2. **Every id must be unique** across the whole routine (exercise ids, superset
   `pairedId`s, and weekly-exercise ids all share one namespace).
3. **Pick a routine `id` that is not** `a`, `b`, `c`, or `d` — those are
   reserved for the built-in routines. Use a short slug, e.g. `"fuerza-2026"`.
4. **After giving the JSON, list what could not be represented** (see
   "Unsupported concepts"). Never silently drop information like weights, RPE,
   tempo, or a periodization scheme — the user must know it was left out.
5. If the user's routine is ambiguous or missing required data (e.g. no rep
   count), ask a brief clarifying question or state the assumption you made.

## Schema reference

Top level (`Routine`):

| Field             | Type                | Required | Rules |
|-------------------|---------------------|----------|-------|
| `id`              | string              | yes      | Non-empty, unique slug, **not** `a`/`b`/`c`/`d` |
| `name`            | string              | yes      | Non-empty. Convention: UPPERCASE, e.g. `"RUTINA FUERZA"` |
| `workoutData`     | `WorkoutDay[]`      | yes      | At least 1 day |
| `weeklyExercises` | `WeeklyExercise[]`  | no       | Defaults to `[]` |
| `notes`           | `string[]`          | no       | Defaults to `[]`. Free text lines |

`WorkoutDay`:

| Field      | Type              | Required | Rules |
|------------|-------------------|----------|-------|
| `id`       | integer           | yes      | Whole number. Convention: `1, 2, 3…` |
| `label`    | string            | yes      | Non-empty. Short, e.g. `"DÍA 1"` |
| `title`    | string            | yes      | Non-empty. Focus of the day, e.g. `"ESPALDA"` |
| `color`    | string            | yes      | Hex color `#RGB` or `#RRGGBB`, e.g. `"#00E5FF"` |
| `restNote` | string            | yes      | May be empty `""`. Short rest hint, e.g. `"1' entre series"` |
| `groups`   | `ExerciseGroup[]` | yes      | At least 1 group |

`ExerciseGroup`:

| Field       | Type         | Required | Rules |
|-------------|--------------|----------|-------|
| `name`      | string       | yes      | Non-empty. Muscle group, e.g. `"PECHO"` |
| `supersets` | boolean      | yes      | `true` if the exercises in this group are supersets |
| `exercises` | `Exercise[]` | yes      | At least 1 exercise |

`Exercise`:

| Field        | Type    | Required | Rules |
|--------------|---------|----------|-------|
| `id`         | string  | yes      | Non-empty, unique |
| `name`       | string  | yes      | Non-empty |
| `sets`       | integer | yes      | Whole number **> 0** |
| `reps`       | string  | yes      | Non-empty **text**: `"12"`, `"8-10"`, `"FALLO"`, `"20 seg"` |
| `pairedWith` | string  | no*      | Superset: name of the paired exercise |
| `pairedId`   | string  | no*      | Superset: unique id of the paired exercise |
| `repsB`      | string  | no*      | Superset: reps of the paired exercise |

\* The three `paired*` fields form a superset and must appear **together or not
at all**. Providing only one or two is rejected. When you use them, also set the
group's `supersets` to `true`.

`WeeklyExercise` (things done N times per week, not tied to a day):

| Field          | Type    | Required | Rules |
|----------------|---------|----------|-------|
| `id`           | string  | yes      | Non-empty, unique |
| `name`         | string  | yes      | Non-empty |
| `sets`         | integer | yes      | Whole number > 0 |
| `reps`         | string  | yes      | Non-empty text |
| `timesPerWeek` | integer | yes      | Whole number > 0 |

### Notes on field semantics

- **`reps` is always a string.** Encode ranges (`"8-10"`), failure (`"FALLO"`),
  time (`"30 seg"`), or per-side notes here. Do not use a number.
- **`sets` is always a whole number.** If the routine says "3-4 series", pick
  one (e.g. 4) and mention the assumption, or fold the range into a note.
- **Colors**: give each day a distinct accent. A usable palette:
  `#00E5FF`, `#FFD600`, `#FF6B6B`, `#7CFFB2`, `#B388FF`, `#FF9E40`.
- **Ids**: a simple, collision-free scheme is `d<day>-<n>` for day exercises
  (`d1-1`, `d1-2`), `d1-1b` for the paired half of a superset, and `w-<n>` for
  weekly exercises.

## Supported concepts (safe to convert)

- Multiple training days, each with a title/focus and a color.
- Grouping exercises by muscle group within a day.
- Number of sets (whole number) and reps as free text.
- **2-exercise supersets** via the `paired*` trio.
- Weekly/accessory work done a fixed number of times per week.
- A short per-day rest hint (`restNote`) and free-text routine `notes`.

## Unsupported concepts — tell the user

These have **no structured field**. Do not invent fields for them. Either fold
them into `reps`/`name`/`notes` as plain text, or omit them — and in both cases
**explicitly tell the user** what happened:

- **Weight / load / %1RM / RPE / RIR** — no weight field. Put in `notes` or the
  exercise `reps` text (e.g. `"8 @RPE8"`) if the user wants, otherwise dropped.
- **Structured rest timers per exercise** — the app has a fixed rest timer; only
  a per-day `restNote` text exists. Encode rest as text, not structure.
- **Tempo / cadence** (e.g. `3-1-1`) — no field; fold into `reps`/`name` or drop.
- **Tri-sets / giant sets (3+ exercises)** — only 2-exercise supersets exist.
  Split into separate exercises (and note it) or represent only a pair.
- **Drop sets / rest-pause / cluster sets** — no structure; describe in `reps`
  or `notes`.
- **Week-by-week periodization / progression** — the routine is flat (one set of
  days). Capture progression only as `notes`, not as separate weeks.
- **Cardio/conditioning blocks** — no dedicated type. Represent as an exercise
  with `reps` as duration text, or as a `note`.
- **Mapping days to specific weekdays** (Mon/Wed/Fri) — days are just labeled
  `DÍA 1…N`; there is no calendar. Mention the intended schedule in `notes`.
- **Images, videos, external links.**

## Validation checklist (run before returning)

- [ ] Valid JSON, single object, no comments/trailing commas.
- [ ] `id` is a non-empty slug and not `a`/`b`/`c`/`d`.
- [ ] `name` non-empty.
- [ ] `workoutData` has ≥ 1 day; each day has ≥ 1 group; each group has ≥ 1 exercise.
- [ ] Every `color` is a valid hex color.
- [ ] Every `sets`/`timesPerWeek` is a whole number > 0; every `reps` is non-empty text.
- [ ] All ids unique across days, superset pairs, and weekly exercises.
- [ ] Supersets use all three `paired*` fields and the group's `supersets: true`.
- [ ] You have listed for the user anything from their routine you could not encode.

## Worked example

User: *"Rutina de fuerza. Día 1 empuje: press banca 4x8 y press inclinado 3x10.
Superserie de tríceps: extensiones 3x12 con fondos 3x al fallo. Abdominales 3x15
dos veces por semana. Sube el peso cada semana."*

Output JSON:

```json
{
  "id": "fuerza-2026",
  "name": "RUTINA FUERZA",
  "workoutData": [
    {
      "id": 1,
      "label": "DÍA 1",
      "title": "EMPUJE",
      "color": "#00E5FF",
      "restNote": "90\" entre series",
      "groups": [
        {
          "name": "PECHO",
          "supersets": false,
          "exercises": [
            { "id": "d1-1", "name": "PRESS BANCA", "sets": 4, "reps": "8" },
            { "id": "d1-2", "name": "PRESS INCLINADO", "sets": 3, "reps": "10" }
          ]
        },
        {
          "name": "TRÍCEPS",
          "supersets": true,
          "exercises": [
            {
              "id": "d1-3",
              "name": "EXTENSIONES",
              "sets": 3,
              "reps": "12",
              "pairedWith": "FONDOS",
              "pairedId": "d1-3b",
              "repsB": "FALLO"
            }
          ]
        }
      ]
    }
  ],
  "weeklyExercises": [
    { "id": "w-1", "name": "ABDOMINALES", "sets": 3, "reps": "15", "timesPerWeek": 2 }
  ],
  "notes": ["Subir el peso cada semana (progresión no representable como estructura)."]
}
```

Then tell the user, for example:

> Convertido. Nota: la progresión semanal de peso no tiene un campo propio en la
> app, la he dejado como nota. El `restNote` "90\"" es orientativo; el
> temporizador de descanso de la app es fijo. Si quieres registrar cargas o RPE,
> dímelo y las añado al texto de las repeticiones o a las notas.
