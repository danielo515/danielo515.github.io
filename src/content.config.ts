import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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
  "golang",
  "reasonml",
  "supabase",
  "nodejs",
  "mongodb",
  "docker",
  "rust",
  "effect-ts",
  "nix",
  "python",
]);

export type TechTag = z.infer<typeof tag>;

export const collections = {
  projects: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
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
        // How the project image is fit inside the detail modal.
        // - "contain" (default): show the full image, letterboxed if needed
        // - "cover": crop the image to fill the modal frame — use when the
        //   source has wide empty padding around the subject
        imageFit: z.enum(["cover", "contain"]).default("contain"),
      }),
  }),
  experience: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
    schema: z.object({
      title: z.string(),
      companyName: z.string(),
      startDate: z.date(),
      endDate: z.date().optional(),
      technologies: z.array(tag).optional(),
    }),
  }),
  about: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/about" }),
    schema: z.object({
      name: z.string(),
      fullName: z.string(),
      linkedin: z.string(),
      stackOverflow: z.string(),
      github: z.string(),
    }),
  }),
  blog: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
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
