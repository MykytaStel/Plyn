# EXP-09 Mutation testing for core

Status: not started · Feeds: [0.30](../ROADMAP.md#0300--quality-gate) · Time box: 1 day

## Question

If we inject small bugs (mutants) into `src/core/` and `src/services/storage/backup.ts`, how many do our tests catch, and is a weekly mutation run worth its cost?

## Why it matters

Coverage shows which lines ran, not whether a test would notice a wrong result. The splitter and backup code protect the reader's position and data, so their tests must fail when the logic is wrong.

## Plan

1. Add Stryker with the Vitest runner on a branch, scoped to `src/core/splitter/`, `src/core/anchor/`, `src/services/storage/backup.ts`.
2. Run it and record: mutation score per file, run time, the surviving mutants.
3. For the 10 most important survivors: is it a missing test, or an equivalent mutant (no behaviour change)?
4. Add the missing tests and re-run.
5. Recommend a score floor and schedule for [TESTING.md L12](../TESTING.md#l12-mutation-testing).

## Success criteria

- A measured score and run time for the scoped files.
- A decision: weekly job with a floor (for example ≥ 70 % on the splitter), or not worth it.

## Constraints

- Never on every PR if it takes more than a few minutes.

## Result

## Decision
