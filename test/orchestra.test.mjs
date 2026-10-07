import test from "node:test";
import assert from "node:assert/strict";
import { PATTERNS, SCENARIO, listPatterns, runPattern, runAll } from "../app/orchestra.mjs";

test("all six article patterns are present", () => {
  assert.deepEqual(
    PATTERNS.map((p) => p.id),
    ["naive", "routing", "pipeline", "fanout", "hierarchy", "evaluator"],
  );
});

test("the un-orchestrated run produces the triple refund", () => {
  const r = runPattern("naive");
  assert.equal(r.refunds, 3);
  assert.equal(r.verdict, "fail");
});

test("every orchestrated pattern issues exactly one refund", () => {
  for (const p of PATTERNS) {
    if (p.id === "naive") continue;
    const r = runPattern(p.id);
    assert.equal(r.refunds, 1, `${p.id} should refund once`);
    assert.equal(r.verdict, "pass");
  }
});

test("evaluator loop stays bounded", () => {
  const r = runPattern("evaluator");
  const revisions = r.events.filter((e) => e.action === "revise").length;
  assert.ok(revisions <= 3, "max 3 revisions per article's stop condition");
});

test("fan-out workers share one step; fan-in merges before the decision", () => {
  const r = runPattern("fanout");
  const step2 = r.events.filter((e) => e.step === 2);
  assert.equal(step2.length, 3, "three parallel researchers");
  const agg = r.events.findIndex((e) => e.action === "fan-in");
  const decide = r.events.findIndex((e) => e.action === "issue refund");
  assert.ok(agg < decide, "aggregation must precede the refund");
});

test("routing dispatches to exactly one specialist", () => {
  const r = runPattern("routing");
  const dispatch = r.events.find((e) => e.action === "dispatch");
  assert.match(dispatch.note, /one specialist/);
  assert.equal(r.agentCalls, 3, "router + specialist + tool");
});

test("unknown pattern returns null", () => {
  assert.equal(runPattern("nope"), null);
});

test("run-all covers every pattern with a scenario", () => {
  const all = runAll();
  assert.equal(all.length, PATTERNS.length);
  for (const r of all) assert.equal(r.scenario.id, SCENARIO.id);
});

test("listPatterns omits runner internals", () => {
  const p = listPatterns()[0];
  assert.deepEqual(Object.keys(p).sort(), ["blurb", "id", "name"]);
});
