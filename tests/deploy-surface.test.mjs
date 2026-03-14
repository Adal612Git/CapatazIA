import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function readFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("deployment surface files exist", () => {
  const requiredFiles = [
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore",
    ".github/workflows/ci.yml",
    "app/api/health/route.ts",
    "app/api/cron/broadcasts/route.ts",
    "vercel.json",
    "supabase/001_capataz_runtime.sql",
    "README.md",
  ];

  requiredFiles.forEach((relativePath) => {
    assert.equal(fs.existsSync(path.join(projectRoot, relativePath)), true, `${relativePath} should exist`);
  });
});

test("README documents healthcheck and Docker flow", () => {
  const readme = readFile("README.md");
  assert.match(readme, /\/api\/health/);
  assert.match(readme, /docker compose up --build/);
  assert.match(readme, /Supabase/);
  assert.match(readme, /Vercel/);
});
