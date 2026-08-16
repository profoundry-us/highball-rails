#!/usr/bin/env node
// The pack installs ITSELF. The runner stays a generic orchestrator that
// executes whatever `checks.yml` names; a pack is content, and content knows
// how to land in a repo. That split means adding a pack never requires a
// runner release.
//
//   npx @profoundry-us/highball-rails install   # vendor + print rules
//   npx @profoundry-us/highball-rails rules     # print rules only
import {
  chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACK_ROOT = fileURLToPath(new URL("..", import.meta.url));
const VERSION = JSON.parse(readFileSync(join(PACK_ROOT, "package.json"), "utf8")).version;

// Vendored, not referenced. The scripts must sit inside the repo so they are
// visible to a bind-mounted container (where node_modules often isn't), and
// so they can be read and audited like any other repo file.
const DEST = ".highball/packs/rails";
const STAMP = join(DEST, ".pack-version");

const USAGE = `highball-rails — the Rails check pack for Highball

Usage:
  highball-rails install   Vendor the checks and rubrics into ${DEST},
                           then print the rules to add to checks.yml.
                           Re-run after upgrading to refresh the copies.
  highball-rails rules     Print the checks.yml rules only.
`;

function install() {
  const installed = existsSync(STAMP)
    ? readFileSync(STAMP, "utf8").trim()
    : null;

  mkdirSync(DEST, { recursive: true });
  // lib/ travels with the checks: they `require_relative "../lib/..."`, so a
  // vendored checks/ without it is a directory of scripts that all die on load.
  for (const dir of [ "checks", "lib", "rubrics" ]) {
    // Replace rather than copy over. A plain copy leaves behind files the pack
    // has since deleted, and a stale script is worse than a missing one: it
    // keeps working, so a checks.yml can go on naming a rule this pack no
    // longer ships — right up until someone installs into a clean tree.
    rmSync(join(DEST, dir), { recursive: true, force: true });
    cpSync(join(PACK_ROOT, dir), join(DEST, dir), { recursive: true });
  }
  // Vendored scripts arrive executable so checks.yml can name them directly.
  const checksDir = join(DEST, "checks");
  for (const file of readdirSync(checksDir)) {
    try {
      chmodSync(join(checksDir, file), 0o755);
    } catch {
      // Best effort — a non-executable copy still runs via `ruby <path>`.
    }
  }
  writeFileSync(STAMP, VERSION + "\n");

  if (installed === VERSION) {
    console.log(`Refreshed ${DEST} (already at ${VERSION}).`);
  } else if (installed) {
    console.log(`Updated ${DEST}: ${installed} -> ${VERSION}.`);
  } else {
    console.log(`Installed the Rails pack ${VERSION} into ${DEST}.`);
  }

  console.log(
    "\nThese are VENDORED copies — edit them freely, but a later " +
    "`install` overwrites.\nKeep local rules in .highball/bin/ instead, " +
    "where the pack never reaches.\n"
  );
  console.log("Add the rules you want to .highball/checks.yml:\n");
  rules();
  return 0;
}

function rules() {
  process.stdout.write(readFileSync(join(PACK_ROOT, "template", "rules.yml"), "utf8"));
  return 0;
}

const command = process.argv[2];
if (command === "install") process.exit(install());
else if (command === "rules") process.exit(rules());
else {
  console.log(USAGE);
  process.exit(command === undefined || command === "--help" ? 0 : 1);
}
