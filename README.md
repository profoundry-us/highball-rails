# @profoundry-us/highball-rails

The Rails check pack for [Highball](https://github.com/profoundry-us/highball-runner):
Prism-based analyzers and AI rubrics for Rails codebases, vendored into your
repo and executed by the Highball runner.

The runner is a generic orchestrator — it runs whatever `.highball/checks.yml`
names, in whatever language. This pack is the Rails *content*: the rules that
would otherwise be hand-copied between repos and quietly drift apart.

## Import it

```bash
npm install --save-dev @profoundry-us/highball-rails
npx @profoundry-us/highball-rails install
```

`install` vendors the scripts into `.highball/packs/rails/` and prints the
rules to add to your `.highball/checks.yml`. Add the ones your codebase
actually believes — the template is tiered, and the tiers matter (see below).

Upgrading is the same two commands:

```bash
npm update @profoundry-us/highball-rails
npx @profoundry-us/highball-rails install   # refreshes the vendored copies
```

`install` records the pack version in `.highball/packs/rails/.pack-version` and
tells you what moved (`0.1.0 -> 0.2.0`), so an upgrade is a reviewable diff in
your own repo rather than an invisible dependency bump.

## Why vendored instead of referenced

The scripts are copied into your repo rather than run out of `node_modules`,
for two concrete reasons:

- **Containers.** Many Rails repos run their toolchain inside Docker, where
  the repo is bind-mounted but `node_modules` frequently isn't. A vendored
  script is visible wherever the repo is.
- **Auditability.** These scripts gate your agent's work. They should be
  readable in your repo, diffable on upgrade, and greppable in review — not
  invisible inside a dependency tree.

The tradeoff is that local edits are overwritten by the next `install`. Keep
repo-specific rules in `.highball/bin/` instead; the pack never touches it.

## Adopt deliberately

The printed rules come in tiers:

| Tier | Contents | Guidance |
|---|---|---|
| 1 | focused specs, spec pairing | True of essentially any Rails app — enable both |
| 2 | comment standards, UUID migrations, gem why-comments | House conventions; enable what you share |
| 3 | logic placement, tenancy | Strong architectural opinions (ActiveInteraction, org-scoped multi-tenancy) — read the script first |
| 4 | component usage, UI standards | LocoMotion-specific |
| AI | comment quality, architecture & naming | `rubric:` rules judged by headless Claude; the runner keeps them off the fast path |

Only tier 1 is uncommented in the template. A rule your codebase doesn't
already believe will fail on day one and teach everyone to ignore the
guardrail, which is worse than not having it.

## What the scripts assume

They are pure analyzers: they read files from the repo root and need **no
database, no network, and no git**. The changed-file list arrives from the
runner via `HIGHBALL_CHANGED_FILES`, so `--changed-only` rules work inside a
container with no repo history. They fall back to asking git directly when
that variable is absent, so they still work when run by hand.

They need **Ruby** (they use Prism, which ships with Ruby 3.3+). In a
containerized repo, that means they run wherever your `exec.via` sends them.

The AI rubrics are not scripts at all. Since runner 0.4.0 they are declared
with `rubric:` instead of `run:`, and the runner judges them itself — always
host-side, since it is the `claude` CLI that has to be reachable, and never on
the `--fast` path. Each rubric's front matter carries the only Ruby-specific
part (`include: "**/*.rb"` and the generated/vendored trees to skip), so the
opinions stay here in the pack while the machinery stays in the runner.

## The `--changed-only` ratchet

Several rules accept `--changed-only`, which limits the scan to files the
current branch touches. That is the rollout mechanism for a codebase with a
legacy backlog: new and edited files must comply, untouched ones wait their
turn, and nobody's turn is blocked by markup they never went near. Run a
script without the flag for the full-repo picture.
