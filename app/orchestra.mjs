// orchestra.mjs — deterministic multi-agent orchestration simulator.
// One scenario (a duplicate-refund complaint) is run through every
// orchestration pattern from the article. Each run returns a trace of
// events plus stats: agent calls, elapsed ticks, refunds issued, verdict.
//
// Pure module: used by app/server.js, public/ browser code, and tests.

export const SCENARIO = {
  id: "refund-complaint",
  title: "Refund complaint #4471",
  detail:
    "Customer reports a double charge on order #4471 and asks for a refund. " +
    "Amount is below the auto-approve threshold; fraud check passes.",
};

// Simulated timing in ticks (not real time). Costs in agent calls.
const COST = { llm: 1, tool: 1 };

export const PATTERNS = [
  {
    id: "naive",
    name: "No orchestration",
    blurb:
      "Three parallel agents, no coordinator. Each decides alone — the article's triple-refund bug.",
  },
  {
    id: "routing",
    name: "Routing",
    blurb: "A router classifies the request and sends it to exactly one specialist.",
  },
  {
    id: "pipeline",
    name: "Pipeline",
    blurb: "Fixed stages, each validated before the next runs.",
  },
  {
    id: "fanout",
    name: "Fan-out / Fan-in",
    blurb: "Parallel researchers with separate scopes; an aggregator merges results.",
  },
  {
    id: "hierarchy",
    name: "Hierarchy",
    blurb: "A supervisor decomposes, delegates to specialists, and combines results.",
  },
  {
    id: "evaluator",
    name: "Evaluator loop",
    blurb: "A creator drafts; an evaluator rejects actionable defects until pass or budget.",
  },
];

function ev(step, actor, action, note = "") {
  return { step, actor, action, note };
}

// Every runner returns { events, agentCalls, ticks, refunds, verdict }.
const RUNNERS = {
  naive() {
    const events = [];
    let step = 0;
    for (const a of ["agent-1", "agent-2", "agent-3"]) {
      events.push(ev(++step, a, "read complaint", "sees order #4471, decides alone"));
      events.push(ev(++step, a, "issue refund", "no check for what the others did"));
    }
    events.push(ev(++step, "ledger", "3 refunds posted", "customer refunded 3× — nobody owns the decision"));
    return {
      events, agentCalls: 3 * COST.llm + 3 * COST.tool, ticks: 6, refunds: 3,
      verdict: "fail",
      verdictNote: "Duplicate refunds. Implicit coordination is not coordination.",
    };
  },

  routing() {
    const events = [
      ev(1, "router", "classify request", "intent=billing, confidence=high"),
      ev(2, "router", "dispatch", "one specialist — not all of them"),
      ev(3, "billing-agent", "verify double charge", "order #4471, fraud check passes"),
      ev(4, "billing-agent", "issue refund", "single owner = single refund"),
      ev(5, "ledger", "1 refund posted", ""),
    ];
    return {
      events, agentCalls: 2 * COST.llm + 1 * COST.tool, ticks: 5, refunds: 1,
      verdict: "pass",
      verdictNote: "One specialist owns the request. Cheapest pattern that stays correct.",
    };
  },

  pipeline() {
    const events = [
      ev(1, "intake", "parse complaint", "extract order id, charge ids"),
      ev(2, "validate", "schema check", "contract before advancing"),
      ev(3, "classifier", "billing / refund", "stage output feeds next stage"),
      ev(4, "resolver", "verify + decide", "double charge confirmed"),
      ev(5, "policy-gate", "auto-approve check", "amount below threshold — allowed"),
      ev(6, "executor", "issue refund", "exactly once, by the last stage"),
      ev(7, "ledger", "1 refund posted", ""),
    ];
    return {
      events, agentCalls: 5 * COST.llm + 2 * COST.tool, ticks: 7, refunds: 1,
      verdict: "pass",
      verdictNote: "Easy to trace and retry. Watch stage-1 errors — they propagate downstream.",
    };
  },

  fanout() {
    const events = [
      ev(1, "coordinator", "decompose", "three independent scopes, shared task id"),
      ev(2, "researcher-orders", "check order ledger", "two captures on #4471"),
      ev(2, "researcher-payments", "check payment provider", "duplicate capture confirmed"),
      ev(2, "researcher-fraud", "check fraud signals", "clean"),
      ev(3, "aggregator", "fan-in", "three reports merge; disagreement preserved"),
      ev(4, "decider", "issue refund", "one decision after merge — not three"),
      ev(5, "ledger", "1 refund posted", ""),
    ];
    return {
      events, agentCalls: 5 * COST.llm + 1 * COST.tool, ticks: 5, refunds: 1,
      verdict: "pass",
      verdictNote: "Parallel evidence gathering. The aggregator dedupes — refunds happen once.",
    };
  },

  hierarchy() {
    const events = [
      ev(1, "supervisor", "receive objective", "decompose into subtasks"),
      ev(2, "supervisor", "assign: verify charge", "→ payments specialist"),
      ev(2, "supervisor", "assign: risk check", "→ risk specialist"),
      ev(3, "payments-spec", "report", "duplicate capture confirmed"),
      ev(3, "risk-spec", "report", "no fraud flags"),
      ev(4, "supervisor", "combine + decide", "global plan held in one place"),
      ev(5, "approver", "human approval", "refund above auto-approve? no — proceeds"),
      ev(6, "executor", "issue refund", "supervisor owns the only refund"),
      ev(7, "ledger", "1 refund posted", ""),
    ];
    return {
      events, agentCalls: 6 * COST.llm + 1 * COST.tool, ticks: 7, refunds: 1,
      verdict: "pass",
      verdictNote: "One global plan. The supervisor is the bottleneck — bound its depth and budget.",
    };
  },

  evaluator() {
    const events = [
      ev(1, "creator", "draft resolution", "v1: refund + apology text"),
      ev(2, "evaluator", "score vs checklist", "FAIL: missing charge evidence"),
      ev(3, "creator", "revise", "v2: attach provider capture ids"),
      ev(4, "evaluator", "score vs checklist", "PASS: all criteria met"),
      ev(5, "executor", "issue refund", "bounded loop: max 3 revisions, used 1"),
      ev(6, "ledger", "1 refund posted", ""),
    ];
    return {
      events, agentCalls: 4 * COST.llm + 1 * COST.tool, ticks: 6, refunds: 1,
      verdict: "pass",
      verdictNote: "Quality gate before action. Stop condition is explicit — no endless polish.",
    };
  },
};

export function listPatterns() {
  return PATTERNS.map(({ id, name, blurb }) => ({ id, name, blurb }));
}

export function runPattern(id) {
  const runner = RUNNERS[id];
  if (!runner) return null;
  return { scenario: SCENARIO, pattern: PATTERNS.find((p) => p.id === id), ...runner() };
}

export function runAll() {
  return PATTERNS.map((p) => runPattern(p.id));
}
