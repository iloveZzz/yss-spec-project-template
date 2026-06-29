# Decision Point Protocol

Canonical path: `comet/reference/decision-point.md`

This protocol is shared by all comet sub-skills that contain user decision points. Any step labeled as a blocking point or user decision point must follow this protocol.

## Core Rules

- Decision points are blocking points. Pause and wait for an explicit user choice before continuing
- Use the current platform's available user input or confirmation mechanism to collect the choice
- If the current platform has no structured question tool, ask clear options in the conversation and stop until the user replies
- Never substitute recommendation rules, defaults, historical preferences, or “the user would probably agree” for current confirmation
- Do not write state fields, execute the chosen branch, or auto-continue before the user explicitly chooses

## Minimum Presentation Requirements

- State what the current decision point is deciding
- Present clear options; when the user must pick one option, keep the options mutually exclusive and actionable
- Recommendations may explain tradeoffs, but may not replace user confirmation
- Only execute the corresponding commands or state updates after the user chooses