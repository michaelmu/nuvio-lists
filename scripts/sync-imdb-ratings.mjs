import { createGunzip } from "node:zlib";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const ratingsUrl = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const listsDirectory = resolve("lists");
const filenames = (await readdir(listsDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort();
const lists = await Promise.all(
  filenames.map(async (filename) => ({
    filename,
    body: JSON.parse(await readFile(join(listsDirectory, filename), "utf8"))
  }))
);
const wantedIds = new Set(
  lists.flatMap(({ body }) => body.items.map((item) => item.imdbId))
);

console.log(`Downloading IMDb's ratings snapshot for ${wantedIds.size} titles...`);
const response = await fetch(ratingsUrl);
if (!response.ok || !response.body) {
  throw new Error(`IMDb ratings download failed with HTTP ${response.status}`);
}

const ratings = new Map();
const lines = createInterface({
  input: Readable.fromWeb(response.body).pipe(createGunzip()),
  crlfDelay: Infinity
});

for await (const line of lines) {
  const [imdbId, averageRating, numberOfVotes] = line.split("\t");
  if (wantedIds.has(imdbId)) {
    ratings.set(imdbId, {
      imdbRating: Number(averageRating),
      imdbVotes: Number(numberOfVotes)
    });
  }
}

const missingIds = [...wantedIds].filter((imdbId) => !ratings.has(imdbId));
if (missingIds.length > 0) {
  throw new Error(`IMDb has no ratings for: ${missingIds.join(", ")}`);
}

const sourceDate = new Date(response.headers.get("last-modified") ?? Date.now())
  .toISOString()
  .slice(0, 10);

for (const { filename, body } of lists) {
  body.ratingsAsOf = sourceDate;
  body.items = body.items.map(({ title, year, imdbId }) => ({
    title,
    year,
    imdbId,
    ...ratings.get(imdbId)
  }));
  await writeFile(
    join(listsDirectory, filename),
    `${JSON.stringify(body, null, 2)}\n`,
    "utf8"
  );
}

const belowThreshold = lists.flatMap(({ filename, body }) =>
  body.items
    .map((item) => ({ filename, ...item, ...ratings.get(item.imdbId) }))
    .filter((item) => item.imdbRating < 7)
);

if (belowThreshold.length > 0) {
  for (const item of belowThreshold) {
    console.error(`${item.filename}: ${item.title} is rated ${item.imdbRating.toFixed(1)}`);
  }
  throw new Error(`${belowThreshold.length} title(s) fall below the 7.0 threshold`);
}

console.log(`Updated ${wantedIds.size} ratings from IMDb's ${sourceDate} snapshot.`);
