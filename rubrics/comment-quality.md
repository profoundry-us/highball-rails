---
# The only language-specific part of an AI rule. The runner supplies the
# engine; this front matter tells it which of the changed files are Ruby and
# which trees are generated or vendored rather than authored.
include: "**/*.rb"
exclude: [db/, bin/, config/, node_modules/, vendor/, .highball/]
---

# Comment quality — the judgment half of comment standards

The check-comments rule enforces presence and shape deterministically; this
rubric judges what a regex can't: whether comments earn their place.

A comment VIOLATES this rubric when it:

1. Restates what the code plainly does ("# increment the counter",
   "# call the service") instead of why it exists, why this approach, or
   what constraint it protects.
2. Talks to a reviewer instead of the next reader ("# fixed per feedback",
   "# updated version", "# this change makes the tests pass").
3. Contradicts the code it sits above — says X while the code does Y.
4. Documents a class with filler that could describe any class
   ("# Handles various operations").

NOT violations — do not flag:

- Comments explaining why, trade-offs, rejected alternatives, or history.
- Terse comments on genuinely self-evident constants or config lines.
- Missing comments — presence is the deterministic check's job, not yours.
- TODO/FIXME hygiene — also the deterministic check's job.
- Style, wording, or length preferences. Judge substance only.

When uncertain whether a comment is "what" or "why", pass it.
