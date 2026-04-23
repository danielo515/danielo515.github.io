---
title: Mapping DB Rows to Tagged Unions with Effect Schema
date: 2026-04-22
description: How to bridge the gap between flat wide-table database rows and Effect tagged union domain types using Schema.transformOrFail, Match.discriminatorsExhaustive, and Match.tagsExhaustive — with exhaustiveness enforced at compile time.
tags:
  - typescript
  - effect-ts
  - database
  - type-safety
---

## Context

Database schemas rarely match the shape of an Effect `Schema` one-to-one.
A common mismatch is a domain tagged union whose persisted form is a flat
row with per-variant nullable columns. `Schema.decode` rejects that row
because its `Encoded` type doesn't match, and `Schema.decodeUnknown`
silently accepts drift between the table and the schema.

There are two levels of answer:

1. If the DB representation per variant is "clean" (separate tables, a
   view, or a JSON payload column), a plain `Schema.Union` is enough —
   no transform, no dispatch.
2. If the DB is a classic wide table with per-variant nullable columns
   (the realistic case), the manual step collapses to a small
   `Match.discriminatorsExhaustive` / `Match.tagsExhaustive` block.
   Exhaustiveness is enforced by the type system, so adding a new
   variant becomes a compile error rather than a silent skip.

## Scenario A — No transform needed (when possible)

If each row only carries the columns for its own variant, a
discriminated `Schema.Union` is the row schema *and* the domain schema.
See `packages/effect/test/Schema/Schema/Union/Union.test.ts:34-77`.

```ts
import { Schema } from "effect"

const Notification = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("Email"), id: Schema.String, address: Schema.String, subject: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal("Sms"),   id: Schema.String, phone: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal("Push"),  id: Schema.String, deviceToken: Schema.String, title: Schema.String })
)
```

## Scenario B — Wide table, nullable columns (realistic)

Table:

```sql
notifications(
  id text, kind text,
  email_address text null, email_subject text null,
  sms_phone text null,
  push_device_token text null, push_title text null
)
```

Domain:

```ts
type Notification =
  | { _tag: "Email"; id: string; address: string; subject: string }
  | { _tag: "Sms";   id: string; phone: string }
  | { _tag: "Push";  id: string; deviceToken: string; title: string }
```

### Step 1 — row schema and domain schema

```ts
import { Match, ParseResult, Schema, pipe } from "effect"

const NotificationRow = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literal("Email", "Sms", "Push"),
  email_address:     Schema.NullOr(Schema.String),
  email_subject:     Schema.NullOr(Schema.String),
  sms_phone:         Schema.NullOr(Schema.String),
  push_device_token: Schema.NullOr(Schema.String),
  push_title:        Schema.NullOr(Schema.String)
})
type NotificationRow = typeof NotificationRow.Type

const Email = Schema.TaggedStruct("Email", { id: Schema.String, address: Schema.String, subject: Schema.String })
const Sms   = Schema.TaggedStruct("Sms",   { id: Schema.String, phone: Schema.String })
const Push  = Schema.TaggedStruct("Push",  { id: Schema.String, deviceToken: Schema.String, title: Schema.String })

const NotificationDomain = Schema.Union(Email, Sms, Push)
type NotificationDomain = typeof NotificationDomain.Type
```

### Step 2 — lift a nullable cell into a `ParseIssue`

```ts
const required =
  <T>(ast: ParseResult.ParseIssue["ast"], row: NotificationRow) =>
  (value: T | null, column: string) =>
    value === null
      ? ParseResult.fail(new ParseResult.Type(ast, row, `${column} required when kind=${row.kind}`))
      : ParseResult.succeed(value)
```

### Step 3 — decode with `Match.discriminatorsExhaustive`

`discriminatorsExhaustive("kind")({...})` forces a handler for every
literal in `kind`. Drop a case → compile error.

```ts
const decodeRow = (row: NotificationRow, ast: ParseResult.ParseIssue["ast"]) => {
  const need = required(ast, row)
  return pipe(
    Match.type<NotificationRow>(),
    Match.discriminatorsExhaustive("kind")({
      Email: (r) =>
        ParseResult.all([need(r.email_address, "email_address"), need(r.email_subject, "email_subject")]).pipe(
          ParseResult.map(([address, subject]) => Email.make({ id: r.id, address, subject }))
        ),
      Sms: (r) =>
        need(r.sms_phone, "sms_phone").pipe(
          ParseResult.map((phone) => Sms.make({ id: r.id, phone }))
        ),
      Push: (r) =>
        ParseResult.all([need(r.push_device_token, "push_device_token"), need(r.push_title, "push_title")]).pipe(
          ParseResult.map(([deviceToken, title]) => Push.make({ id: r.id, deviceToken, title }))
        )
    })
  )(row)
}
```

### Step 4 — encode with `Match.tagsExhaustive`

On the domain side `_tag` is the discriminator, so use `tagsExhaustive`.
Again: add a fourth tag to the union → compile error here.

```ts
const nulls = {
  email_address: null, email_subject: null,
  sms_phone: null,
  push_device_token: null, push_title: null
} as const

const encodeDomain = Match.type<NotificationDomain>().pipe(
  Match.tagsExhaustive({
    Email: (n) => ({ ...nulls, id: n.id, kind: "Email" as const, email_address: n.address, email_subject: n.subject }),
    Sms:   (n) => ({ ...nulls, id: n.id, kind: "Sms"   as const, sms_phone: n.phone }),
    Push:  (n) => ({ ...nulls, id: n.id, kind: "Push"  as const, push_device_token: n.deviceToken, push_title: n.title })
  })
)
```

### Step 5 — wire them with `Schema.transformOrFail`

```ts
const Notification = Schema.transformOrFail(NotificationRow, NotificationDomain, {
  decode: (row, _opts, ast) => decodeRow(row, ast),
  encode: (domain) => ParseResult.succeed(encodeDomain(domain))
})

// Usage
// Schema.decode(Notification)(rowFromDriver) -> Effect<NotificationDomain, ParseError>
// Schema.encode(Notification)(domainValue)   -> Effect<NotificationRow,    ParseError>
```

## Why this beats `decodeUnknown`

- `Match.discriminatorsExhaustive` and `Match.tagsExhaustive` both
  reject non-exhaustive handlers at compile time — the same guarantee a
  `switch` gives with `Match.exhaustive`, but declarative.
- The row schema is itself a typed `Schema`. Rename a column → DB
  queries and the transform both fail to type-check.
- Each variant mapping is one line once null-lifting is factored out.

## Scenario C — Escape hatches

- **JSON payload column.** `kind text` + `payload jsonb`; decode with
  `Schema.parseJson(Schema.Union(Email, Sms, Push))`. No transform
  needed.
- **Per-variant tables + view.** The view emits Scenario A rows.
