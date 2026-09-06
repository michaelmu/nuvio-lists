import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = join(root, normalize(relativePath));

    if (!filePath.startsWith(`${root}/`) && filePath !== join(root, "index.html")) {
      throw new Error("Invalid path");
    }

    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end('{"error":"Not found"}\n');
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving http://127.0.0.1:${port}`);
});
