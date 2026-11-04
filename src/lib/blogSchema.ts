import { z } from "astro/zod";

/**
 * Frontmatter fields of the `blog` collection, minus `image`.
 *
 * `image` lives in `src/content.config.ts` because it needs Astro's
 * `image()` helper, which only exists at build time. Everything else is
 * plain zod, so it is shared verbatim between the content collection and
 * the client-side editor (`/blog/new`) — the editor validates a draft
 * against the very same rules the build will apply to the committed file.
 */
export const blogFrontmatterFields = {
  title: z.string(),
  description: z.string(),
  date: z.date(),
  tags: z.array(z.string()),
};

/**
 * What the editor enforces before letting a draft be published. Same
 * fields as above, but non-empty: the collection schema accepts an empty
 * title, a post with one would just be useless.
 */
export const blogDraftSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria (se usa en las tarjetas y en el SEO)"),
  date: z.date({ error: "La fecha no es válida" }),
  tags: z.array(z.string().trim().min(1)).min(1, "Añade al menos una etiqueta"),
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug sólo admite minúsculas, números y guiones",
    ),
  body: z.string().trim().min(1, "El cuerpo del artículo está vacío"),
});

export type BlogDraftInput = z.input<typeof blogDraftSchema>;
export type BlogDraftValues = z.output<typeof blogDraftSchema>;
