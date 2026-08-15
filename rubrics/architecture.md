---
# The only language-specific part of an AI rule. The runner supplies the
# engine; this front matter tells it which of the changed files are Ruby and
# which trees are generated or vendored rather than authored.
include: "**/*.rb"
exclude: [db/, bin/, config/, node_modules/, vendor/]
---

# Architecture & naming — the judgment half of house standards

Deterministic checks handle file placement and markup shape; this rubric
judges what they can't: whether new code follows the house architecture.

VIOLATIONS:

1. Parts, slots, or CSS hooks named by appearance instead of role:
   `:left`/`:right`/`:blue_box` instead of `:master`/`:detail`/
   `:actions`. Names should survive a redesign.
2. Multi-step business logic in a controller action — create, then
   update, then notify — instead of an ActiveInteraction under
   app/interactions. Controllers are thin dispatchers: auth, one
   interaction call, render.
3. Seed code that isn't idempotent: bare `create!` in db/seeds without a
   find_or_create_by!/find_or_initialize_by guard, so reseeding
   duplicates rows.
4. Query or formatting logic accreting on models that belongs in an
   interaction (writes, multi-model flows) or a component (presentation).

NOT violations — do not flag:

- Simple one-model CRUD directly in a controller action.
- Domain-semantic params on components (status:, result:, session:).
- Scopes, predicates, and small presentation helpers on models.
- Existing code an edit merely brushes against — judge the change, not
  the neighborhood.

When uncertain, pass.
