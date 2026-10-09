import { co, type Group, type Loaded, z } from "jazz-tools";

// ─── JAZZ SCHEMA ─────────────────────────────────────────────────────────────
// The editor never keeps state only in React: every keystroke lands in a
// CoValue, so a reload, a crash or a closed tab cannot lose a draft. With
// sync enabled (passphrase auth) the same drafts follow you across devices.
//
// Every field is required with an "empty" value rather than optional — a
// half-filled draft is the normal state of this app, and optional fields
// would only push the emptiness into the type system.

export const DraftTags = co.list(z.string());
export type LoadedDraftTags = Loaded<typeof DraftTags>;

export const BlogDraft = co.map({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  /** ISO `yyyy-mm-dd`. Kept as a string because that is exactly what ends
   *  up in the frontmatter — round-tripping through Date would drag the
   *  browser timezone into the published date. */
  date: z.string(),
  tags: DraftTags,
  body: z.string(),
  /** Cover image, inlined as a data URL. Empty string when there is none. */
  coverName: z.string(),
  coverDataUrl: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type LoadedBlogDraft = Loaded<typeof BlogDraft>;

export const BlogDrafts = co.list(BlogDraft);
export type LoadedBlogDrafts = Loaded<typeof BlogDrafts>;

export const EditorRoot = co.map({
  drafts: BlogDrafts,
  /** Jazz id of the draft currently open, or "" when none is selected. */
  currentDraftId: z.string(),
});

export const BlogEditorAccount = co
  .account({
    profile: co.profile(),
    root: EditorRoot,
  })
  .withMigration((account) => {
    if (!account.$jazz.has("root")) {
      account.$jazz.set(
        "root",
        EditorRoot.create({
          drafts: BlogDrafts.create([]),
          currentDraftId: "",
        }),
      );
    }
  });

// ─── OPERATIONS ──────────────────────────────────────────────────────────────

export function todayISO(): string {
  // Local calendar day, not UTC: publishing at 01:00 CET should not date the
  // post to the previous day.
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Turns a title into a filename-safe slug: strips accents, drops anything
 * that is not a letter or a digit, collapses separators into single dashes.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createDraft(owner: Group) {
  const now = new Date();
  return BlogDraft.create(
    {
      slug: "",
      title: "",
      description: "",
      date: todayISO(),
      tags: DraftTags.create([], { owner }),
      body: "",
      coverName: "",
      coverDataUrl: "",
      createdAt: now,
      updatedAt: now,
    },
    { owner },
  );
}

type DraftTextField = "slug" | "title" | "description" | "date" | "body";

export function updateDraftField(
  draft: LoadedBlogDraft,
  field: DraftTextField,
  value: string,
) {
  draft.$jazz.set(field, value);
  draft.$jazz.set("updatedAt", new Date());
}

export function setDraftCover(
  draft: LoadedBlogDraft,
  cover: { name: string; dataUrl: string } | null,
) {
  draft.$jazz.set("coverName", cover?.name ?? "");
  draft.$jazz.set("coverDataUrl", cover?.dataUrl ?? "");
  draft.$jazz.set("updatedAt", new Date());
}

export function setDraftTags(draft: LoadedBlogDraft, tags: string[]) {
  const list = draft.tags;
  if (!list.$isLoaded) return;
  // `applyDiff` keeps the CoList identity (and therefore any concurrent
  // edits from another device) instead of replacing the whole list.
  list.$jazz.applyDiff(tags);
  draft.$jazz.set("updatedAt", new Date());
}

export function draftTitle(draft: LoadedBlogDraft): string {
  return draft.title.trim() || "Borrador sin título";
}
