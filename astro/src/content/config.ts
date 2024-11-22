import { defineCollection, z } from "astro:content";

const tag = z.object({
  name: z.string(),
  class: z.string(),
  icon: z.enum(["nextjs", "tailwind", "react", "svelte", "astro", "obsidian"]),
});

export const collections = {
  projects: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      description: z.string(),
      image: z.string(),
      category: z.string(),
      technologies: z.array(z.string()),
      url: z.string().optional(),
      github: z.string().optional(),
      tags: z.array(tag),
    }),
  }),
};
