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
  } catch (error) {
    console.error("Error generating PDF:", error);
    console.error(
      "Make sure you have Playwright installed. You can install it with:"
    );
    console.error("pnpm add -D playwright");
    console.error("pnpm exec playwright install chromium");
    process.exit(1);
  } finally {
    // Ensure the browser is closed even if there's an error
    if (browser) await browser.close();
  }
}

generatePdf();
