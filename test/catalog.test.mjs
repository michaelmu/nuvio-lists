import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const outputDirectory = resolve("dist");
const manifest = await readJson(join(outputDirectory, "manifest.json"));

test("manifest declares a catalog resource", () => {
  assert.ok(manifest.resources.includes("catalog"));
  assert.ok(manifest.catalogs.length > 0);
  assert.deepEqual(manifest.idPrefixes, ["tt"]);
});

for (const catalog of manifest.catalogs) {
  test(`${catalog.type}/${catalog.id} is a valid static catalog`, async () => {
    const body = await readJson(
      join(outputDirectory, "catalog", catalog.type, `${catalog.id}.json`)
    );

    assert.ok(body.metas.length > 0);
    assert.equal(new Set(body.metas.map((meta) => meta.id)).size, body.metas.length);

    for (const meta of body.metas) {
      assert.match(meta.id, /^tt\d{7,9}$/);
      assert.equal(meta.type, catalog.type);
      assert.ok(meta.name);
      assert.match(meta.poster, /^https:\/\//);
      assert.match(meta.releaseInfo, /^\d{4}$/);
    }
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
