# Software development skill

Use this for implementing a feature or fixing a defect in an existing project.

## Workflow

1. Inspect project structure, local instructions, relevant implementation, and current repository state.
2. Preserve existing behavior and data. Make the requested end-to-end change in small reviewable units.
3. Prefer explicit interfaces, bounded permissions, and recoverable failure states.
4. Update documentation when setup, behavior, privacy, or limitations change.
5. Run only checks requested by the user or required to establish the change is buildable; report the exact evidence.
6. Summarize changed files, behavior, verification, and remaining dependencies.

## Approval

Proceed with reversible local edits that the user requested. Before external publication, deployment, data deletion, account changes, or other consequential actions, prepare a reviewable result and obtain approval unless the user already authorized that exact action.
