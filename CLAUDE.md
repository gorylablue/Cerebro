# El Cerebro — guía para Claude

- The user is a beginner working from an iPad. Explain in plain Spanish (Puerto Rico). See README.md for structure (no build step, IndexedDB data, bump `CACHE` in `sw.js` on every change).
- Project skill `.claude/skills/apple-design/`: use for gestures, motion, materials and typography (`js/ui/motion.js`).
- Goals/posts prepared outside the app go in `js/data/seed.js` packs (applied once per pack id, never overwrite).

## Ahorro de créditos (regla permanente del usuario, 2026-10-21)
- Applies to every platform: Claude Code, Netlify, Canva and anything connected later. Always pick the cheapest route that does the job.
- Netlify (free credits): never push app changes straight to `main`. Work on branch `cambios`, show the user screenshots/preview, merge to `main` in one batch after approval → one deploy. `netlify.toml` `ignore` skips builds for other branches and for commits that only touch notes, skills or tests; keep it.
- Claude Code: effort proportional to the task — targeted reads, few screenshots, reuse scripts, no subagents unless asked; ask before heavy jobs.
- Paid APIs: never without explicit permission.
