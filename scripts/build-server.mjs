#!/usr/bin/env node
// Bundle the Node.js server entrypoint with esbuild.
import { build } from "esbuild";
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outdir = resolve(root, "dist-server");

const args = new Set(process.argv.slice(2));
const watch = args.has("--watch");
const minify = !args.has("--no-minify");

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const start = Date.now();

const result = await build({
  entryPoints: [resolve(root, "src/server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: resolve(outdir, "server.js"),
  // We do NOT bundle @aws-sdk/client-s3 — it's only loaded lazily by the
  // S3 storage adapter, and the user can choose not to use S3 at all.
  // Keeping it external also means a smaller image and faster cold starts.
  external: [
    "@aws-sdk/*",
    "mysql2",
    "drizzle-orm",
    "hono",
    "@hono/*",
    "zod",
    "@hono/zod-validator",
    "node:*",
  ],
  banner: {
    // esbuild's ESM output needs an explicit shim for `require`/`__dirname`
    // in some npm packages, and we want a single file with no surprises.
    js: "import { createRequire as __crq } from 'module'; const require = __crq(import.meta.url);",
  },
  sourcemap: true,
  minify,
  logLevel: "info",
});

const { size } = await stat(resolve(outdir, "server.js"));
console.log(`✓ bundled ${(size / 1024).toFixed(1)} KB in ${Date.now() - start} ms`);

// Copy .env.example to the dist-server for convenience
await copyFile(resolve(root, ".env.example"), resolve(outdir, ".env.example")).catch(() => {});

if (result.errors.length > 0) {
  process.exit(1);
}
