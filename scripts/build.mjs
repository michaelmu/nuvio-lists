import { readFile, readdir, rm, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const listsDirectory = join(projectRoot, "lists");
const outputDirectory = join(projectRoot, "dist");
const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));

const jsonFiles = (await readdir(listsDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort();

if (jsonFiles.length === 0) {
  throw new Error("Add at least one JSON list under lists/.");
}

const lists = [];
const catalogKeys = new Set();

for (const filename of jsonFiles) {
  const list = JSON.parse(await readFile(join(listsDirectory, filename), "utf8"));
  validateList(list, filename);

  const catalogKey = `${list.type}:${list.id}`;
  if (catalogKeys.has(catalogKey)) {
    throw new Error(`${filename}: duplicate catalog ${catalogKey}`);
  }
  catalogKeys.add(catalogKey);
  lists.push(list);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const manifest = {
  id: "com.github.michaelmu.nuvio-lists",
  version: packageJson.version,
  name: "Codex Lists",
  description: "Static movie and series lists curated with Codex",
  resources: ["catalog"],
  types: [...new Set(lists.map((list) => list.type))],
  catalogs: lists.map(({ type, id, name }) => ({ type, id, name })),
  idPrefixes: ["tt"]
};

await writeJson(join(outputDirectory, "manifest.json"), manifest);

for (const list of lists) {
  const metas = list.items.map(({ title, year, imdbId, imdbRating }) => ({
    id: imdbId,
    type: list.type,
    name: title,
    poster: `https://images.metahub.space/poster/medium/${imdbId}/img`,
    background: `https://images.metahub.space/background/medium/${imdbId}/img`,
    releaseInfo: String(year),
    imdbRating: imdbRating.toFixed(1)
  }));

  await writeJson(
    join(outputDirectory, "catalog", list.type, `${list.id}.json`),
    { metas }
  );
}

await writeFile(join(outputDirectory, ".nojekyll"), "", "utf8");
await writeFile(join(outputDirectory, "index.html"), renderIndex(lists), "utf8");

console.log(`Built ${lists.length} catalog(s) with ${lists.reduce((sum, list) => sum + list.items.length, 0)} total item(s).`);

function validateList(list, filename) {
  if (!list || typeof list !== "object" || Array.isArray(list)) {
    throw new Error(`${filename}: root must be an object`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(list.id ?? "")) {
    throw new Error(`${filename}: id must be a lowercase kebab-case slug`);
  }
  if (typeof list.name !== "string" || list.name.trim() === "") {
    throw new Error(`${filename}: name is required`);
  }
  if (!new Set(["movie", "series"]).has(list.type)) {
    throw new Error(`${filename}: type must be movie or series`);
  }
  if (!Array.isArray(list.items) || list.items.length === 0) {
    throw new Error(`${filename}: items must be a non-empty array`);
  }
  if (!Number.isInteger(list.targetSize) || list.targetSize < 1) {
    throw new Error(`${filename}: targetSize must be a positive integer`);
  }
  if (list.items.length !== list.targetSize) {
    throw new Error(`${filename}: expected ${list.targetSize} items, found ${list.items.length}`);
  }

  const ids = new Set();
  list.items.forEach((item, index) => {
    const location = `${filename}: items[${index}]`;
    if (typeof item.title !== "string" || item.title.trim() === "") {
      throw new Error(`${location}: title is required`);
    }
    if (!Number.isInteger(item.year) || item.year < 1888 || item.year > 2200) {
      throw new Error(`${location}: year is invalid`);
    }
    if (!/^tt\d{7,9}$/.test(item.imdbId ?? "")) {
      throw new Error(`${location}: imdbId must look like tt1234567`);
    }
    if (typeof item.imdbRating !== "number" || item.imdbRating < 7 || item.imdbRating > 10) {
      throw new Error(`${location}: imdbRating must be between 7.0 and 10.0`);
    }
    if (!Number.isInteger(item.imdbVotes) || item.imdbVotes < 1) {
      throw new Error(`${location}: imdbVotes must be a positive integer`);
    }
    if (ids.has(item.imdbId)) {
      throw new Error(`${location}: duplicate IMDb ID ${item.imdbId}`);
    }
    ids.add(item.imdbId);
  });
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function renderIndex(catalogs) {
  const catalogMarkup = catalogs.map((catalog) => `
      <article>
        <p class="eyebrow">${escapeHtml(catalog.type)}</p>
        <h2>${escapeHtml(catalog.name)}</h2>
        <p>${escapeHtml(catalog.description ?? "")}</p>
        <p>${catalog.items.length} titles</p>
      </article>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codex Lists for Nuvio</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; background: #0c0d10; color: #f5f5f2; }
    main { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 12vh 0; }
    h1 { max-width: 12ch; margin: 0 0 20px; font-size: clamp(3rem, 10vw, 6rem); line-height: .92; letter-spacing: -.06em; }
    h2 { margin: 6px 0 12px; font-size: 1.5rem; }
    p { color: #b6b7bd; line-height: 1.6; }
    .install { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin: 36px 0 52px; }
    input, button { border: 1px solid #303239; border-radius: 10px; padding: 13px 15px; font: inherit; }
    input { min-width: 0; background: #15171c; color: #e9e9e7; }
    button { cursor: pointer; background: #d8ff59; color: #111; font-weight: 700; }
    section { display: grid; gap: 14px; }
    article { padding: 24px; border: 1px solid #272930; border-radius: 16px; background: #121318; }
    article p:last-child { margin-bottom: 0; }
    .eyebrow { margin: 0; color: #d8ff59; font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    @media (max-width: 560px) { .install { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Nuvio catalog add-on</p>
    <h1>Codex Lists</h1>
    <p>Static, hand-reviewed movie and series recommendations. Copy the manifest URL and install it in Nuvio.</p>
    <div class="install">
      <input id="manifest" aria-label="Manifest URL" readonly>
      <button id="copy" type="button">Copy URL</button>
    </div>
    <section>${catalogMarkup}
    </section>
  </main>
  <script>
    const manifest = new URL("manifest.json", window.location.href).href;
    const input = document.querySelector("#manifest");
    const button = document.querySelector("#copy");
    input.value = manifest;
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(manifest);
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = "Copy URL"; }, 1500);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
