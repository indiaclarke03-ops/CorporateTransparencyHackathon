# Follow the Public Dollar — front end

The Next.js app lives in `app/`, `components/` and `lib/`. The Python pipeline (`apps/api`, `scoring/`, `scripts/`) and the research files (`research/`, `fixtures/`) have their own conventions; this file covers the front end only. The source of truth for the product is `docs/follow-the-public-dollar-spec.md`.

## Purpose
Dashboard for regulators tracing public money (awards, subawards, purchases) into ownership, trade, and payment networks, with shell-company risk indicators. Outputs are risk leads for review, not findings of wrongdoing.

## Stack (do not change without asking)
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS v4 + shadcn/ui (Radix, `components/ui`)
- Package manager: **pnpm** (CI runs `pnpm install --frozen-lockfile`; always commit `pnpm-lock.yaml`)
- Icons: lucide-react. Graph: @xyflow/react. Sankey: d3-sankey. Shared state: zustand. Tests: vitest (`pnpm test`)
- Charts (recharts) and tables (@tanstack/react-table, react-virtual) are allowed when a screen needs them.

## Deployment constraint
Every push to `main` deploys a **static export** to GitHub Pages (`GITHUB_PAGES=true`, base path `/CorporateTransparencyHackathon`). No server code, API routes or runtime `fetch` to our own backend. Dynamic routes need `generateStaticParams`. Build asset URLs with `process.env.NEXT_PUBLIC_BASE_PATH`.

## Structure
- `app/page.tsx` case workspace; `app/report/[caseId]/page.tsx` print report; `app/traceability` research showcase (India's, keep its data flow)
- `components/<area>/*.tsx` UI components; `components/common` shared chips, badges, range bar
- `lib/types.ts` all shared types; `lib/cases.ts` loads cases; `lib/mock/*.ts` demo data only
- `lib/store.ts` zustand store; `lib/format.ts` formatters; logic in pure `lib/*.ts` modules with tests in `lib/*.test.ts`

## Data rules
- Real cases come from the citation-audited fixtures (`public/fixtures/*.json`, copies of `fixtures/`). Never add a fact to a real case that its fixture does not contain.
- Demo values live in `lib/mock` only. Every screen showing demo scores, tiers or dollars shows the "Demo data" badge; demo-only connections are marked on the graph.
- Distinguish missing from zero: show a gray "Not in record" pill for missing fields, never a blank or 0.
- Terms from spec section 9: signal states are exactly `fired | not_fired | not_assessable`; tiers are High, Elevated, Low, Not assessable; entity matches carry grades A–D.
- Official list status is shown separately from the score. Only US, UN, EU and UK lists count toward the score (spec 9.2); other listings are context.

## Copy rules (enforce everywhere)
- Never write "is a shell company", "laundered", "evaded", "fraudulent", "lost", or "diverted" about an entity.
- Use "indicators consistent with shell-company activity", "risk lead", "warrants review", "estimated risk-weighted exposure".
- Persistent banner: "Outputs are risk leads for review, not findings of wrongdoing."
- Sentence case, plain labels, no playful copy (spec 10.3, 10.4).

## Design tokens (spec 10.2, defined in `app/globals.css`)
- `ink` text, `slate` secondary text, `paper` background, `rule` borders, `ledger` public money and primary actions, `elevated` and `high` tiers, `unconfirmed` for "possibly same as" and not assessable.
- Typeface Public Sans (interface), Source Serif 4 (report body). Tabular figures for numbers.
- Never convey a tier by color alone: always a text label and a distinct marker shape.
- WCAG AA contrast in light and dark mode (dark follows the OS setting).

## Quality bar for every change
- `pnpm build` passes with no TypeScript errors; `pnpm test` passes.
- Keyboard accessible; visible focus states; aria labels on icon buttons.
- Do not add dependencies beyond the stack list without asking.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
