import { blogDraftSchema, type BlogDraftValues } from "@/lib/blogSchema";

/**
 * Serialising a draft into the exact file the repository expects: YAML
 * frontmatter followed by the markdown body, matching the style of the
 * posts already in `src/content/blog`.
 */

/** Where a post's markdown file lives, relative to the repo root. */
export const BLOG_CONTENT_DIR = "src/content/blog";

/**
 * YAML scalars only need quoting in a handful of cases. Titles and
 * descriptions routinely contain colons ("Effect Schema: a tour"), which is
 * exactly one of them, so quote whenever the value could be misread and
 * escape the quotes inside.
 */
function yamlScalar(value: string): string {
  const trimmed = value.trim();
  const needsQuotes =
    trimmed === "" ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(trimmed) ||
    /:\s/.test(trimmed) ||
    /\s#/.test(trimmed) ||
    /[\n\r]/.test(trimmed) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(trimmed) ||
    /^[\d.+-]+$/.test(trimmed);

  if (!needsQuotes) return trimmed;
  return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
}

export type PostFile = {
  /** Repo-relative path of the markdown file. */
  path: string;
  /** Full file contents, frontmatter included. */
  content: string;
};

export type CoverImage = {
  /** File name as committed next to the markdown, e.g. `my-post.png`. */
  name: string;
  /** Base64 payload, without the `data:` prefix. */
  base64: string;
};

/**
 * Builds the markdown file for a draft. `coverName`, when given, is written
 * as a relative `image:` reference — that is what Astro's `image()` helper
 * resolves against the markdown file's own directory.
 */
export function buildPostFile(
  draft: BlogDraftValues,
  coverName?: string,
): PostFile {
  const lines = [
    "---",
    `title: ${yamlScalar(draft.title)}`,
    `description: ${yamlScalar(draft.description)}`,
  ];

  if (coverName) lines.push(`image: ./${coverName}`);

  lines.push(`date: ${toISODate(draft.date)}`, "tags:");
  for (const tag of draft.tags) lines.push(`  - ${yamlScalar(tag)}`);
  lines.push("---", "");

  // Exactly one trailing newline, whatever the editor buffer ended with.
  lines.push(`${draft.body.trim()}\n`);

  return {
    path: `${BLOG_CONTENT_DIR}/${draft.slug}.md`,
    content: lines.join("\n"),
  };
}

function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Splits a `data:` URL into the parts the GitHub API wants: a file name
 * carrying the right extension and the raw base64 payload.
 */
export function coverFromDataUrl(
  slug: string,
  fileName: string,
  dataUrl: string,
): CoverImage | null {
  const match = /^data:([^;,]+)?(?:;[^,]*)*,(.*)$/s.exec(dataUrl);
  if (!match) return null;

  const [, mime = "", payload = ""] = match;
  const extension =
    /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ??
    mime.split("/")[1] ??
    "png";

  return { name: `${slug}.${extension}`, base64: payload };
}

/** Validates a draft and, when valid, produces the files to commit. */
export type BuildResult =
  | { ok: true; post: PostFile; cover: CoverImage | null }
  | { ok: false; errors: string[] };

export function buildPublishableFiles(input: {
  title: string;
  description: string;
  date: string;
  tags: string[];
  slug: string;
  body: string;
  coverName: string;
  coverDataUrl: string;
}): BuildResult {
  const parsed = blogDraftSchema.safeParse({
    title: input.title,
    description: input.description,
    // The date arrives as `yyyy-mm-dd`; parsing it at midday sidesteps the
    // timezone shift that would otherwise move it to the previous day.
    date: input.date ? new Date(`${input.date}T12:00:00`) : new Date(Number.NaN),
    tags: input.tags,
    slug: input.slug,
    body: input.body,
  });

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const cover =
    input.coverDataUrl && input.coverName
      ? coverFromDataUrl(parsed.data.slug, input.coverName, input.coverDataUrl)
      : null;

  return {
    ok: true,
    post: buildPostFile(parsed.data, cover?.name),
    cover,
  };
}
