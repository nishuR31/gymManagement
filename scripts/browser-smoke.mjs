import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const webUrl = process.env.SMOKE_WEB_URL ?? "http://localhost:5173/";
const apiUrl = process.env.SMOKE_API_URL ?? "http://localhost:4000";
const chromeBin = process.env.CHROME_BIN ?? findChrome();
const distDir = process.env.SMOKE_DIST_DIR ? resolve(process.env.SMOKE_DIST_DIR) : null;
const smokePages = parseSmokePages(process.env.SMOKE_PAGES);

if (!chromeBin) {
  throw new Error("Chrome was not found. Set CHROME_BIN to run browser smoke tests.");
}

await assertApiHealth();
for (const page of smokePages) {
  assertPageRenders(new URL(page.path, webUrl).toString(), page.expectedText);
}
if (distDir) {
  await assertDistAssetsServed(distDir);
}

console.log(`Browser smoke passed for ${webUrl} using ${chromeBin}`);

async function assertApiHealth() {
  const response = await fetch(`${apiUrl}/health`);
  if (!response.ok) {
    throw new Error(`API health failed with HTTP ${response.status}`);
  }
  const body = await response.json();
  if (body.status !== "ok") {
    throw new Error(`API health returned unexpected payload: ${JSON.stringify(body)}`);
  }
}

async function assertDistAssetsServed(directory) {
  const assetDir = join(directory, "assets");
  const assetFiles = readdirSync(assetDir).filter((name) => /\.(?:js|css)$/.test(name));
  if (assetFiles.length === 0) {
    throw new Error(`No JS/CSS assets found in ${assetDir}`);
  }

  for (const fileName of assetFiles) {
    const response = await fetch(new URL(`/assets/${fileName}`, webUrl));
    if (!response.ok) {
      throw new Error(`Asset ${fileName} failed with HTTP ${response.status}`);
    }
  }
}

function assertPageRenders(url, expectedText) {
  const userDataDir = mkdtempSync(join(tmpdir(), "gym-browser-smoke-"));
  try {
    const result = spawnSync(
      chromeBin,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        `--user-data-dir=${userDataDir}`,
        "--virtual-time-budget=5000",
        "--dump-dom",
        url
      ],
      { encoding: "utf8" }
    );

    if (result.status !== 0) {
      throw new Error(`Chrome failed: ${result.stderr || result.stdout}`);
    }
    if (!result.stdout.includes(expectedText)) {
      throw new Error(`Rendered page did not contain expected text: ${expectedText}`);
    }
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

function findChrome() {
  for (const candidate of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]) {
    const result = spawnSync("which", [candidate], { encoding: "utf8" });
    if (result.status === 0) {
      return result.stdout.trim();
    }
  }
  return null;
}

function parseSmokePages(value) {
  if (!value) {
    return [
      { path: "/", expectedText: "ValorFitness" },
      { path: "/plans", expectedText: "Memberships" },
      { path: "/dashboard/members", expectedText: "Sign in" }
    ];
  }

  return value.split(",").map((entry) => {
    const [path, expectedText] = entry.split(":", 2);
    if (!path || !expectedText) {
      throw new Error("SMOKE_PAGES entries must use /path:Expected text");
    }
    return { path, expectedText };
  });
}
