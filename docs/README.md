# Documentation assets

The main README embeds Mermaid diagrams for GitHub rendering. Editable sources:

| Source | Purpose |
| --- | --- |
| [architecture.mmd](architecture.mmd) | Application layers and persistence boundaries |
| [agent-workflow.mmd](agent-workflow.mmd) | Agent requests, review, apply, discard, and undo |
| [data-flow.mmd](data-flow.mmd) | Request/response sequence for an approved AI change |

Update both the source and matching Mermaid block in [README.md](../README.md) when changing a diagram. Standalone sources can be opened in Mermaid-compatible editors.

## Screenshots

These are actual development captures from 31 October 2026, inspected before inclusion:

- `screenshots/planning-studio.png`: emerald-and-cream studio at a narrow viewport.
- `screenshots/live-clock.png`: the time-zone selector on the planning overview.
- `screenshots/expenses.png`: sample commitment and deposit in an earlier UI theme.

They show sample event values and historical UI state, not today's clock or current database contents. No guest contacts, API keys, or account credentials are visible. The original captures remain under ignored `artifacts/`; these copies are intentionally versioned for reliable GitHub image links.

## Branding

`assets/eventiq-logo.svg` copies the existing application icon from `app/icon.svg`. Keep these in sync when the product icon changes.

## Scope

Initial creation and manual edits save directly; AI changes to existing events use proposal review. Live supplier search is not connected. The diagrams describe implemented behavior.
