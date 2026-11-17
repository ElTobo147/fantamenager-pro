# Project memory

## Product intent & audience

- Fantasy football (calcio) management web app: build rosters, calculate formations from real-world match data, export WhatsApp-ready lineups.
- Audience: Italian fantasy football managers (fantaallenatori).
- PWA-installable so users add it to phone home/desktop and see the app's own brand instead of Bolt.

## Brand personality & voice

- "FM" monogram logo on green gradient as primary brand mark.
- Italian-language UI; set `lang="it"` to block Chrome auto-translate.
- Polished, production-grade, not cookie-cutter (per global instructions in `.bolt/prompt`).

## Visual design & UX direction

- Stack: Vite + React + JSX + Tailwind + Lucide React; `@/` path alias to `src/`.
- Brand colors: green gradient backdrop for FM logo/icon.
- Top navigation: buttons on a separate row, horizontally scrollable on mobile with hidden scrollbar; must not expand viewport.
- Mobile overflow discipline: lock document `overflow-x`; avoid margin/flex that causes right-side white block during horizontal scroll.
- PWA assets: SVG favicon + 192/512px icons with "FM" mark; manifest present; Bolt references removed from social meta tags.

## Decisions, constraints & rationale

- Use only Lucide React for icons; no extra UI/theme/icon packages unless explicitly requested.
- Prefer `@/` imports over deep relative paths.
- Keep Chrome from offering page translation via `lang="it"` rather than per-element hacks.
- Fix mobile white-block-at-right by constraining nav container overflow + hidden scrollbar, not by hiding content.

## Open questions & assumptions

- Assume users install primarily on mobile; desktop PWA still supported.
- No external UI kits installed yet; assumed sufficient for current UI.
- Formation calculation data source/refresh cadence not yet specified.
- No theme/dark mode direction established beyond green brand accent.