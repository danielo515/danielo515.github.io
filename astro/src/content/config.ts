import { defineCollection, z } from "astro:content";

const tag = z.enum([
  "nextjs",
  "tailwind",
  "react",
  "redux",
  "svelte",
  "astro",
  "obsidian",
  "typescript",
  "firebase",
]);

export type TechTag = z.infer<typeof tag>;

export const collections = {
  projects: defineCollection({
    type: "content",
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string(),
        image: image(),
        gallery: z.array(image()),
        category: z.string(),
        technologies: z.array(z.string()),
        url: z.string().optional(),
        github: z.string().optional(),
        tags: z.array(tag),
      }),
  }),
  experience: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      companyName: z.string(),
      startDate: z.date(),
      endDate: z.date().optional(),
    }),
  }),
  about: defineCollection({
    type: "content",
    schema: z.object({
      name: z.string(),
      fullName: z.string(),
      linkedin: z.string(),
      stackOverflow: z.string(),
      github: z.string(),
    }),
  }),
  blog: defineCollection({
    type: "content",
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string(),
        image: image().optional(),
        date: z.date(),
        tags: z.array(z.string()),
      }),
  }),
};
