# Codex Build Instructions (Binding)

You are building this repository from scratch using the specs in /specs.

## Read these files first (in order)

1. specs/platform-doctrine.md
2. specs/platform-core-definition.md
3. specs/ro-assistant-workload-spec.md
4. specs/execution-ready-blueprint.md

## Non-negotiables (must enforce in code)

* tenant\_id derived ONLY from auth context
* Postgres RLS enforced with app.\* session variables
* No PII in embeddings/prompts/logs/vector queries
* PII only in pii\_vault as ciphertext
* Reference-only outputs with citations
* No cross-tenant or cross-workload data access

## Output format required

For each task:

* Create/modify files exactly as needed
* Show git-style diff or list of files changed
* Provide commands to run and expected output
* Do not invent requirements not present in specs

## Implementation plan

Execute tasks from Codex Task List v1.0 (which you will create as docs/codex\_tasks.md from the blueprint).

