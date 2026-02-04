# Agents Documentation

Documentation for AI coding agents working on this codebase.

## Stack

- **Framework**: [Astro](https://astro.build/) 4.x - Static site generator with island architecture
- **Language**: TypeScript 5.x (strict mode via `astro/tsconfigs/strictest`)
- **UI Library**: React 18 for interactive components
- **Styling**: Tailwind CSS 3.x with typography plugin
- **Animation**: Motion library
- **Icons**: Lucide React

## Package Manager

This project uses **pnpm**. Always use `pnpm` for package operations:

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start development server
pnpm run build        # Build with TypeScript check
pnpm run check        # Run TypeScript check only
pnpm run preview      # Build and preview production
```

## Content Collections

Content is organized using Astro's content collections with Zod schemas defined in `src/content/config.ts`.

### Available Collections

#### `blog` (src/content/blog/)
```typescript
{
  title: string
  description: string
  image?: ImageMetadata    // Optional cover image
  date: Date
  tags: string[]
}
```

#### `projects` (src/content/projects/)
```typescript
{
  title: string
  description: string
  image: ImageMetadata     // Required project image
  category: string
  technologies: string[]
  url?: string             // Optional live URL
  github?: string          // Optional GitHub URL
  tags: TechTag[]          // See allowed tags below
}
```

#### `experience` (src/content/experience/)
```typescript
{
  title: string
  companyName: string
  startDate: Date
  endDate?: Date           // Optional (omit for current position)
  technologies?: TechTag[]
}
```

#### `about` (src/content/about/)
```typescript
{
  name: string
  fullName: string
  linkedin: string
  stackOverflow: string
  github: string
}
```

### Allowed TechTag Values

When using `tags` in projects or `technologies` in experience, use only these values:

```
nextjs, tailwind, react, redux, svelte, astro, obsidian, typescript,
firebase, golang, reasonml, supabase, nodejs, mongodb, docker, rust,
effect-ts, nix, python
```

## Project Structure

```
src/
├── components/     # Astro & React components
├── content/        # Content collections (blog, projects, experience, about)
├── layouts/        # Base layout templates
├── lib/            # Utility functions
├── pages/          # Route pages (file-based routing)
└── config.ts       # Site configuration
```

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `./src/*`
- `@/icons/*` → `./src/components/icons/*`
