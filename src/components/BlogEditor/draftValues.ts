import type { LoadedBlogDraft } from "./schema/Draft";

/**
 * A draft flattened into plain data. Jazz CoValues are proxies whose fields
 * may be individually unloaded, which is fine for rendering but awkward for
 * the pure functions that validate and serialise a post — those take this
 * instead.
 */
export type DraftValues = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  body: string;
  coverName: string;
  coverDataUrl: string;
};

export function toDraftValues(draft: LoadedBlogDraft): DraftValues {
  return {
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    date: draft.date,
    tags: draft.tags.$isLoaded ? [...draft.tags] : [],
    body: draft.body,
    coverName: draft.coverName,
    coverDataUrl: draft.coverDataUrl,
  };
}
