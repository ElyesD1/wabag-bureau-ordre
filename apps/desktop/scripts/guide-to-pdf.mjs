// Render the bundled installation/usage guide (public/guide.html) to a branded
// A4 PDF, so it can be attached to the GitHub Release next to the installers.
// CI installs Playwright (chromium) and runs: node apps/desktop/scripts/guide-to-pdf.mjs
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const guide = path.resolve("apps/desktop/public/guide.html");
const out = path.resolve("WABAG-BureauOrdre-Guide.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(guide).href, { waitUntil: "networkidle" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
});
await browser.close();
console.log("wrote", out);
