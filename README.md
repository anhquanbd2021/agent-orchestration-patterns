# Orchestration Patterns Lab — companion demo

Interactive lab for the article *Agent Orchestration: How Multiple Agents Work
Together*. One scenario — a double-charge refund complaint — is run through six
coordination designs. The un-orchestrated run is the article's opening bug:
three parallel agents each decide to issue a refund, and the customer is
refunded three times.

Zero dependencies — Node 20+ only. The pattern engine (`app/orchestra.mjs`) is
a plain ES module shared by the server, the browser UI, and the test suite.

## What it shows

| Pattern | Refunds | Why |
|---|---|---|
| No orchestration | 3 | Every agent acts alone — nobody owns the decision |
| Routing | 1 | One specialist per request |
| Pipeline | 1 | Fixed stages, validated contracts, execute once |
| Fan-out/fan-in | 1 | Parallel evidence, aggregated before deciding |
| Hierarchy | 1 | Supervisor holds the plan; approval gate before action |
| Evaluator loop | 1 | Bounded revision until criteria pass |

## Run it

```text
npm start   # lab on :3000
npm test    # pattern semantics (bounded loops, single-refund invariant, …)
```
