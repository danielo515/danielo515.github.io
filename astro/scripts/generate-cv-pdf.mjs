// @ts-check
import fs from "fs/promises";
import { dirname, join } from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const outputDir = join(projectRoot, "public", "pdf");
const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");
const outputPath = join(outputDir, `Danielo_${year}-${month}-${day}.pdf`);

async function generatePdf() {
  console.log("Launching browser to generate CV PDF...");

  // Define browser outside the try block so it's accessible in the finally block
  let browser = null;

  try {
    // Launch a headless browser
    browser = await chromium.launch({ headless: true });

    // Create a new page
    const page = await browser.newPage();

    // Set viewport size for consistent rendering
    await page.setViewportSize({ width: 1280, height: 1600 });

    // Navigate to the CV page (assuming running local dev server)
    const url = process.env.CV_URL || "http://localhost:4321/cv";
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });

    // Wait a bit for any dynamic content to fully render
    await page.waitForTimeout(2000);

    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate PDF
    console.log(`Generating PDF to ${outputPath}`);
    await page.pdf({
      path: outputPath,
      format: "A4",
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
      printBackground: true,
    });

    console.log("PDF generated successfully!");
    console.log(`PDF is available at: ${outputPath}`);

    // Extract just the filename from the path
    const path = await import("path");
    const pdfFilename = path.basename(outputPath);

    // Output in GitHub Actions format if running in GitHub Actions
    if (process.env.GITHUB_ACTIONS === "true") {
      // This is the new syntax for GitHub Actions workflow (using $GITHUB_OUTPUT)
      if (process.env.GITHUB_OUTPUT) {
        const fs = await import("fs");
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `pdf_path=${outputPath}\n`
        );
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `pdf_name=${pdfFilename}\n`
        );
      } else {
        console.log(
          "::error title=Missing GITHUB_OUTPUT environment variable::GITHUB_OUTPUT environment variable is not set. Please run this script in a GitHub Actions workflow."
        );
      }
    }

    // Return the path for potential use in JS actions or local scripts
    return outputPath; // This return statement is used when function completes successfully
  } catch (error) {
    console.error("Error generating PDF:", error);
    console.error(
      "Make sure you have Playwright installed. You can install it with:"
    );
    console.error("pnpm add -D playwright");
    console.error("pnpm exec playwright install chromium");
    // Return null instead of exiting to make the function return a value even in error case
    // This allows the function to be used in module contexts
    return null;
  } finally {
    // Ensure the browser is closed even if there's an error
    if (browser) await browser.close();
  }
}

// Export for use as a module
export { generatePdf };

// If this script is the main module (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Script is being run directly
  const pdfPath = await generatePdf();
  console.log(`Script completed. Generated PDF: ${pdfPath}`);
  process.exit(0);
}
