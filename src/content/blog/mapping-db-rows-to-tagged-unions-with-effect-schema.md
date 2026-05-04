---
title: Mapping DB Rows to Tagged Unions with Effect Schema
date: 2026-04-22
description: Database schemas rarely match your domain types. Here's how to safely map a wide table with nullable columns to a discriminated union — with exhaustiveness enforced by the type system.
tags:
  - typescript
  - effect-ts
  - database
  - type-safety
---

## The problem

Database schemas rarely match the shape of domain types.
A common mismatch is a tagged union whose persisted form is a flat wide table with
per-variant nullable columns. `Schema.decode` rejects that row because
its `Encoded` type doesn't match, and `Schema.decodeUnknown` silently
accepts drift between the table and the schema.

The wide table pattern looks like this:

```sql
notifications(
  id text, kind text,
  email_address text null, email_subject text null,
  sms_phone text null,
  push_device_token text null, push_title text null
)
```

And the domain type we want on the TypeScript side:

```ts
type Notification =
  | { _tag: "Email"; id: string; address: string; subject: string }
  | { _tag: "Sms";   id: string; phone: string }
  | { _tag: "Push";  id: string; deviceToken: string; title: string }
```

The solution is a `Schema.transformOrFail` that maps between the two,
with exhaustiveness enforced at compile time in both directions.

## Step 1 — row schema and domain schema

```ts
import { Effect, Either, Match, ParseResult, Schema, SchemaAST } from "effect"

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

## Step 2 — decode with an exhaustive switch

`NotificationRow` is a flat struct, not a discriminated union type, so
`Match.discriminatorsExhaustive` doesn't apply here — it needs a union where
each member carries a distinct literal. A `switch` on `row.kind` with an
explicit return type is the right tool: TypeScript narrows the `kind` field in
each branch, and if you later add a new literal to `Schema.Literal(...)` without
adding a case, the compiler errors because the function might not return.

The `need` helper is defined inline so TypeScript can infer the generic `T`
directly from each call site without fighting the curried form.

```ts
const decodeRow = (
  row: NotificationRow,
  ast: SchemaAST.Transformation
): Effect.Effect<NotificationDomain, ParseResult.ParseIssue> => {
  const need = <T>(value: T | null, column: string) =>
    value === null
      ? ParseResult.fail(new ParseResult.Type(ast, row, `${column} required when kind=${row.kind}`))
      : ParseResult.succeed(value)
  switch (row.kind) {
    case "Email":
      return Either.all([need(row.email_address, "email_address"), need(row.email_subject, "email_subject")]).pipe(
        ParseResult.map(([address, subject]) => Email.make({ id: row.id, address, subject }))
      )
    case "Sms":
      return need(row.sms_phone, "sms_phone").pipe(
        ParseResult.map((phone) => Sms.make({ id: row.id, phone }))
      )
    case "Push":
      return Either.all([need(row.push_device_token, "push_device_token"), need(row.push_title, "push_title")]).pipe(
        ParseResult.map(([deviceToken, title]) => Push.make({ id: row.id, deviceToken, title }))
      )
  }
}
```

## Step 3 — encode with `Match.tagsExhaustive`

For the encode direction the situation is different: `NotificationDomain` is a
proper tagged union (`Schema.Union` of `TaggedStruct` variants), so
`Match.tagsExhaustive` works correctly here. Each handler receives a
properly-narrowed type, and adding a fourth variant to the union becomes a
compile error.

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

## Step 4 — wire them with `Schema.transformOrFail`

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

- The row schema is itself a typed `Schema`. Rename a column → DB
  queries and the transform both fail to type-check.
- The explicit return type on `decodeRow` gives exhaustiveness: add a new
  literal to `Schema.Literal` and forget the switch case → compile error.
- `Match.tagsExhaustive` on the encode side gives the same guarantee for
  the domain → row direction, because `NotificationDomain` is a proper union.
- Each variant mapping is concise once null-lifting is factored out.

## Escape hatches

Not every project ends up with wide tables. Two common alternatives:

- **JSON payload column.** `kind text` + `payload jsonb`; decode with
  `Schema.parseJson(Schema.Union(Email, Sms, Push))`. No transform needed.
- **Per-variant tables + view.** The view emits clean rows where each row only
  carries the columns for its own variant, which a plain `Schema.Union` handles
  without any transform.

---

<div class="not-prose mt-10">
  <details class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
    <summary class="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      Complete example
    </summary>
    <div class="relative">
      <button id="copy-complete" class="absolute top-3 right-3 z-10 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Copy</button>
      <pre id="complete-code" class="m-0 rounded-none text-sm p-6 bg-gray-900 dark:bg-gray-950 text-gray-100 overflow-x-auto leading-relaxed"></pre>
    </div>
  </details>
</div>

<script>
  (function () {
    var pre = document.getElementById("complete-code");
    var btn = document.getElementById("copy-complete");
    if (!pre || !btn) return;

    pre.textContent = `import { Effect, Either, Match, ParseResult, Schema, SchemaAST } from "effect"

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

const decodeRow = (
  row: NotificationRow,
  ast: SchemaAST.Transformation
): Effect.Effect<NotificationDomain, ParseResult.ParseIssue> => {
  const need = <T>(value: T | null, column: string) =>
    value === null
      ? ParseResult.fail(new ParseResult.Type(ast, row, \`\${column} required when kind=\${row.kind}\`))
      : ParseResult.succeed(value)
  switch (row.kind) {
    case "Email":
      return Either.all([need(row.email_address, "email_address"), need(row.email_subject, "email_subject")]).pipe(
        ParseResult.map(([address, subject]) => Email.make({ id: row.id, address, subject }))
      )
    case "Sms":
      return need(row.sms_phone, "sms_phone").pipe(
        ParseResult.map((phone) => Sms.make({ id: row.id, phone }))
      )
    case "Push":
      return Either.all([need(row.push_device_token, "push_device_token"), need(row.push_title, "push_title")]).pipe(
        ParseResult.map(([deviceToken, title]) => Push.make({ id: row.id, deviceToken, title }))
      )
  }
}

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

const Notification = Schema.transformOrFail(NotificationRow, NotificationDomain, {
  decode: (row, _opts, ast) => decodeRow(row, ast),
  encode: (domain) => ParseResult.succeed(encodeDomain(domain))
})`;

    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.textContent).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = "Copy"; }, 2000);
      });
    });
  })();
</script>
