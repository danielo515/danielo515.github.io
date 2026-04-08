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

### Adding Dependencies

**NEVER** modify `package.json` directly to add or update dependencies. Always use the package manager CLI:

```bash
pnpm add <package>              # Add a new dependency
pnpm add -D <package>           # Add a dev dependency
pnpm add <package>@<version>    # Add a specific version
pnpm add <package>@latest       # Add the latest version explicitly
```

When reinstalling or updating existing dependencies, always specify the version explicitly or use `@latest` to ensure deterministic installs.

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

## Task Completion Requirements

Before considering any task complete, you **MUST** run the following checks:

1. **Type Check**: Run `pnpm run check` to verify there are no TypeScript errors
2. **Build**: Run `pnpm run build` to ensure the project builds successfully

Both commands must pass without errors before committing or marking a task as done. If either fails, fix the issues before proceeding.

## Git Commit Messages

**NEVER** include Claude Code session URLs (e.g. `https://claude.ai/code/session_...`) in commit messages or pull request descriptions. Keep commit messages clean and focused on the changes.
