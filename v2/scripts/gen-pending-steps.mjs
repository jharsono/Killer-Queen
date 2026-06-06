/**
 * One-shot generator: turn cucumber's "undefined step" snippets into a single
 * pending step-definitions file. Run once to bootstrap Phase 0's red spec:
 *
 *   npm test 2>/tmp/kq_cuke.txt 1>&2 ; node scripts/gen-pending-steps.mjs /tmp/kq_cuke.txt
 *
 * Phase 1+ replaces these pending bodies with real GameSession-driving steps.
 */
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2] ?? "/tmp/kq_cuke.txt";
const out = new URL("../features/step_definitions/steps.ts", import.meta.url);

const raw = readFileSync(input, "utf8");

// Match the chosen snippet first-lines only (cucumber comments out the
// ambiguous alternatives with a leading "//").
const lineRe = /^\s*(Given|When|Then)\('((?:[^'\\]|\\.)*)', function \(([^)]*)\) \{/;

const byPattern = new Map();
for (const line of raw.split("\n")) {
  const m = line.match(lineRe);
  if (!m) continue;
  const [, keyword, pattern, params] = m;
  if (byPattern.has(pattern)) continue; // dedupe by pattern (keywords are aliases)
  byPattern.set(pattern, { keyword, params });
}

const sorted = [...byPattern.entries()].sort((a, b) => a[0].localeCompare(b[0]));

const typedParams = (params) =>
  params
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `${p}: unknown`)
    .join(", ");

const body = sorted
  .map(([pattern, { keyword, params }]) => {
    const sig = typedParams(params);
    return `${keyword}('${pattern}', function (${sig}) {\n  return 'pending';\n});`;
  })
  .join("\n\n");

const header = `/**
 * Pending step definitions for the Killer Queen behavior spec.
 *
 * Generated from cucumber's undefined-step snippets (scripts/gen-pending-steps.mjs).
 * EVERY step returns 'pending' — Phase 0 makes the docs/features contract RUN
 * and report red. Phases 1+ replace these bodies with steps that drive an
 * instantiable GameSession headlessly (scripted keys; assert on VIRTUAL_UPDATE
 * batches and win/flow events), greening the suite slice by slice.
 *
 * The KQWorld (features/support/world.ts) gives steps a per-scenario GameSession.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Given, When, Then } from '@cucumber/cucumber';

`;

writeFileSync(out, header + body + "\n");
console.log(`Wrote ${sorted.length} pending step definitions to features/step_definitions/steps.ts`);
