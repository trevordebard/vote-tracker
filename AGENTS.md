# Agent Notes

## UI Reliability Rule
- For dark-filled controls (for example `bg-ink`), do not rely on utility classes alone for text color on interactive elements.
- Prefer a `<button>` for in-app navigation actions and set text color explicitly with `style={{ color: "var(--on-ink)" }}` to prevent invisible text regressions.
