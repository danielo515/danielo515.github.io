# CV PDF Generation

This document explains how to generate a PDF version of your CV from the website.

## Setup

The project uses Nix to provide a consistent environment with pnpm for package management.

1. Make sure you have Nix installed on your system.
2. Enter the Nix shell from the project directory to access pnpm:

   ```bash
   cd /path/to/danielo515.github.io/astro
   nix-shell
   ```

3. Install Playwright and necessary browsers:

```bash
pnpm add -D playwright
pnpm exec playwright install chromium
```

## Generating the PDF

There are two ways to generate the PDF:

### 1. Generate PDF only

To generate the PDF without rebuilding the site:

```bash
# Start the development server in one terminal
pnpm run dev

# In another terminal
pnpm run generate-pdf
```

The PDF will be saved to `public/pdf/cv.pdf`.

### 2. Build site and generate PDF

To build the site and generate the PDF in a single command:

```bash
pnpm run build:with-pdf
```

## Customization

You can customize the PDF generation by editing `scripts/generate-cv-pdf.mjs`. Some options you can modify:

- PDF format (currently set to A4)
- Margins
- Page dimensions and viewport size
- Whether to include background elements
- URL of the CV page

## Environment Variables

- `CV_URL`: Override the URL to generate the PDF from. Default is `http://localhost:4321/cv`.

Example:

```bash
CV_URL=https://danielo515.github.io/cv pnpm run generate-pdf
```
