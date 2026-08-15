import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(ROOT, "bin", "highball-rails.js");

function installInto() {
  const dir = mkdtempSync(join(tmpdir(), "hb-pack-"));
  const out = execFileSync(process.execPath, [ CLI, "install" ], {
    cwd: dir, encoding: "utf8"
  });
  return { dir, out };
}

test("install vendors every check and rubric into the repo", () => {
  const { dir } = installInto();
  const checks = readdirSync(join(dir, ".highball/packs/rails/checks"));
  const shipped = readdirSync(join(ROOT, "checks"));

  assert.deepEqual(checks.sort(), shipped.sort());
  assert.ok(checks.includes("check-spec-hygiene"));
  assert.ok(existsSync(join(dir, ".highball/packs/rails/rubrics/architecture.md")));
});

test("vendored checks are executable, so checks.yml can name them directly", () => {
  const { dir } = installInto();
  const path = join(dir, ".highball/packs/rails/checks/check-spec-hygiene");

  assert.ok(statSync(path).mode & 0o111, "expected the executable bit");
});

test("install stamps the version and reports an upgrade on re-run", () => {
  const { dir } = installInto();
  const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
  const stamp = readFileSync(join(dir, ".highball/packs/rails/.pack-version"), "utf8");
  assert.equal(stamp.trim(), version);

  // Re-running is idempotent and says so rather than pretending it's new.
  const again = execFileSync(process.execPath, [ CLI, "install" ], {
    cwd: dir, encoding: "utf8"
  });
  assert.match(again, /already at/);
});

test("install prints the rules snippet, and it is valid YAML", () => {
  const { out } = installInto();
  assert.match(out, /Add the rules you want/);
  assert.match(out, /- id: spec-hygiene/);

  // Ruby is a hard requirement for the checks themselves, so it is fair game
  // for validating the template we ship alongside them.
  const rules = execFileSync(process.execPath, [ CLI, "rules" ], { encoding: "utf8" });
  const parsed = execFileSync("ruby", [
    "-ryaml", "-e",
    'doc = YAML.safe_load($stdin.read); puts doc["checks"].map { |c| c["id"] }.join(",")'
  ], { input: rules, encoding: "utf8" }).trim();

  // Only the universally-true rules ship enabled; the rest are commented out
  // so adopters opt in deliberately.
  assert.deepEqual(parsed.split(","), [ "spec-hygiene", "spec-pairing", "comment-standards" ]);
});

test("every rubric declares the language policy the runner judges by", () => {
  for (const file of readdirSync(join(ROOT, "rubrics"))) {
    const text = readFileSync(join(ROOT, "rubrics", file), "utf8");
    const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
    assert.ok(match, `${file} is missing YAML front matter`);

    // Without `include`, the runner would bundle every changed file — sending
    // HAML and JSON to a judge that only has opinions about Ruby.
    const meta = execFileSync("ruby", [
      "-ryaml", "-rjson", "-e", 'puts YAML.safe_load($stdin.read).to_json'
    ], { input: match[1], encoding: "utf8" });
    const parsed = JSON.parse(meta);

    assert.equal(parsed.include, "**/*.rb");
    assert.ok(Array.isArray(parsed.exclude) && parsed.exclude.includes("db/"));
  }
});

test("checks that need Prism say so instead of dying on a LoadError", () => {
  for (const file of readdirSync(join(ROOT, "checks"))) {
    const source = readFileSync(join(ROOT, "checks", file), "utf8");
    if (!source.includes('require "prism"')) continue;

    // Prism is the pack's only dependency beyond plain Ruby (3.3+). A repo on
    // an older Ruby should be told which rule to drop, not handed a backtrace.
    assert.match(source, /rescue LoadError/, `${file} requires Prism unguarded`);
    assert.match(source, /Ruby 3\.3\+/, `${file} does not name the version floor`);
  }
});

test("every shipped check is syntactically valid Ruby", () => {
  for (const file of readdirSync(join(ROOT, "checks"))) {
    execFileSync("ruby", [ "-c", join(ROOT, "checks", file) ], { stdio: "pipe" });
  }
});
