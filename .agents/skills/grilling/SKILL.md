---
name: grilling
description: 澄清只有业务方才能决定的问题，检验需求假设和方案取舍，或整理第三方待答问题清单；复用已有确认，可调查事实自行核实。
---

When the requested output is a question list for someone else to answer, use **Third-party questions** below. For a live decision interview with the user, use the rounds that follow.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round. Phrase each recommendation so an affirmative answer accepts it; make a contrary preference explicit. Reuse settled answers and keep the round small enough to answer clearly.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs an environment fact, look it up directly; delegate only when an independent bounded investigation can run usefully alongside other work — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

Delegate only within authorization and host capability, with a fresh context (Codex's supported API: `fork_turns: "none"`). Supply the goal, completion criteria, permissions, owned paths, readable source/version pointers, expected output and limitations to report; do not copy the whole conversation or present prior guesses as facts. Supply minimum source text when pointers are unreadable, or work sequentially when independent context is unavailable. Delegation grants no extra write permission; an authorized writer must know others share the codebase and must preserve their changes and path ownership.

Stop when decisions material to the agreed scope are settled, remaining uncertainty is explicit and the next action is authorized. Reuse existing confirmations; do not traverse irrelevant branches or re-ask settled questions. New material decisions still require a real user response.

## Third-party questions

Use this branch when the missing knowledge belongs to someone other than the user:

- Establish the recipient's role, what they know and what facts or decisions the user needs back. Reuse known context; ask the user only for missing details about the recipient or intended use, rather than interviewing them about knowledge they do not hold.
- Read available source material first. State what is already known and aim questions at the remaining gaps; distinguish a factual question from a decision the recipient is authorized to make.
- Draft a short purpose and enough background for a recipient outside the conversation. Order questions by importance, ask one thing per question and leave an answer slot. Invite partial answers, uncertainty and links to supporting evidence; include a deadline only when one was supplied.
- Finish when the requested gaps are covered and the draft is usable by the intended recipient. Return it in the conversation or an authorized destination. Drafting does not authorize sending, creating a new questionnaire skill or treating silence as agreement.
