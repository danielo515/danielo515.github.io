import { defineCollection, z } from "astro:content";

const tag = z.enum([
  "nextjs",
  "tailwind",
  "react",
  "svelte",
  "astro",
  "obsidian",
  "typescript",
]);

export const collections = {
  projects: defineCollection({
    type: "content",
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string(),
        image: image(),
        category: z.string(),
        technologies: z.array(z.string()),
        url: z.string().optional(),
        github: z.string().optional(),
        tags: z.array(tag),
      }),
  }),
};
