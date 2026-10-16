# DESIGN TOKENS AND UI QA

Tokens live in `frontend/src/app/globals.css` (dark default, `[data-theme="light"]` override): surfaces `--c-bg/surface/surface-2/surface-3`,
text `--c-text/text-2/text-3`, borders `--c-border/border-strong`, brand `--c-primary`, **status `--c-error/warning/success/info`** (added in run 2;
they were referenced but undefined before). Rule: use tokens, never hard-coded red/amber/green.

Shared primitives added: `ProvenanceBadge` (data class), `AttentionQueue`, app-shell drawer (mobile).
Shell: fixed sidebar >= md; below md an off-canvas drawer (hamburger, backdrop, Escape closes); main/topbar offset by `--sw`; page padding scales.

UI QA done (run 2): overflow + console + failed-request sweep at 1440/1024/768/375/320 (dark), 1440 + 375 (light) for admin, ops 1280, team.
Not done: keyboard/focus order audit, contrast measurement, reduced-motion, screen-reader pass.
