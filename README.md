# jobu! — personal job inbox

A small, Gmail-like inbox for Pun's next career step: Visual / Graphic Design toward UI. Open a job to see its description, salary, location, application link, match notes, and portfolio evidence. The user requested repository career memory; see [docs/memory/career-profile.md](docs/memory/career-profile.md) and [docs/memory/portfolio-evidence.md](docs/memory/portfolio-evidence.md).

## Run

Node.js 20.19+ or 22.12+ is required. This cloud environment uses Node.js 24.

```bash
cd /workspace/JS-26
npm ci --cache /tmp/nextrole-npm-cache
npm run dev -- --port 5173
```

Use the existing checkout. Cloud tasks are isolated; no worktree is necessary.

```bash
npm run build
npm run preview -- --port 4173
```

## Visual identity

A light-gray canvas, charcoal header and actions, white reading surfaces, and pink accents follow the latest reference. The `jobu!` wordmark has no preceding icon. The face favicon and lightweight live SVG mascot remain part of the identity. The mascot looks toward a mouse pointer, blinks, and reacts to hover, saved actions, form errors, empty search results, and map loading. Touch devices use centred pupils and action reactions; reduced-motion preferences disable tracking, blinking, idle movement, and transitions. SVG assets work offline without an image service. See [design-identity.md](docs/design-identity.md) for tokens and accessibility choices.

The previous local-storage key is deliberately retained so a branding update does not lose user data. The exporter also writes the old `nextrole-prototype.html` artifact path for compatibility.

## Current experience

- **New / Saved / All** folders, unread rows, search, work-mode filter, newest-found order.
- Click to read in a desktop side panel or full-screen phone view.
- Detail view: original pasted JD, salary, work mode, workplace, apply/source link, qualitative S/A/B/C fit tier with reasons, portfolio evidence, and missing information.
- **Save / Skip / Applied** actions. Skip can be undone; read/saved/applied state persists locally.
- Mark unread to return a job to the new inbox.
- Profile and portfolio stay in settings. No large hero, comparison feature, or kanban dashboard.
- Add a job with its location, salary bounds, source URL, and application URL.
- Preserve prior prototype local-storage profile, saved jobs, feedback, and checklists during upgrade.

Opening an application link does not mark the job applied or submit anything. The Applied action is a manual record. Discovery date, posting date, and last status-check date are separate. Missing facts are never fabricated.

## Fit tiers

- **S — น่าลุยมาก:** a strong match of core work and portfolio evidence; check actual terms before applying.
- **A — น่าสมัคร:** relevant core experience, with a few points to confirm.
- **B — ลองขยับ:** transferable skills, with additional portfolio evidence needed.
- **C — ยังไม่ค่อยตรง:** the main work is far from the current evidence or target field.

This is qualitative triage, not numeric score bands. Manual keyword imports receive provisional A/B/C assignments; S requires stronger review and is illustrated in the demo. Missing salary/location gets a separate **รอเช็กข้อมูล** flag. Salary and office-day conflicts also stay separate, rather than being hidden in the letter. Do not interpret a tier as a guarantee that a vacancy meets the user's hard constraints.

Older imported jobs are classified from their title/JD while retaining IDs, source links, saved/read/applied state, and other historical data. Legacy numeric fields may remain in browser storage for continuity but do not affect tier assignment or appear in the UI.

## Workplace maps

Maps use a Google Maps query embed with no API key. The map is requested **only after clicking Load map**; a separate link can open Google Maps directly. Neither the user's home address nor browser location is sent.

Remote jobs have no invented office pin. Fictional hybrid/on-site jobs show explicitly labelled example districts, not company addresses. Imported locations are user-provided and are not geocoded/verified by the app. Unknown locations get a clear empty state.

Live map availability requires access to `www.google.com`. The current cloud egress policy returned HTTP 403 for that host. Its allowlist addition was saved in the environment draft; draft saving alone does not apply it. The smoke test checks the iframe URL and opt-in behaviour using a mocked provider, not a claim that live Google Maps loaded.

## Data and prototype limits

The eight initial vacancies/companies and tier assignments are fictional. Portfolio previews are real project pages from the user's draft Port Beta 4. Tiers are not calibrated assessments or offer probabilities. Numeric fit and growth scores are no longer displayed or generated. Salary and acceptable office-day defaults remain unset unless the user fills them; old user settings are preserved.

Manual assessment uses keyword rules, not AI. The app does not inspect source URLs or verify open status. No backend, automatic discovery, weekly agent, Notion sync, or automatic applications are connected.

State is stored in the current browser under `nextrole.prototype.v1`; it is not synchronized with GitHub or other devices. **Repository memory is separate:** editing profile settings does not update the memory files automatically. Original PDFs, phone number, email, and detailed home address are excluded from the repository and app bundle.

## Portable file

```bash
npm run export:standalone
```

Open `artifacts/jobu-prototype.html` in your browser. Fonts, images, and application code are embedded, so the inbox works offline. Maps and external application links need Internet access after the user clicks them. Storage behaviour for local files varies by browser; serving the app is more consistent.

## Functional checks

With the server running:

```bash
npm run test:smoke
# Identity, contrast, and mascot checks:
npm run test:design
# Or target the production preview:
APP_URL=http://127.0.0.1:4173 npm run test:smoke
```

Uses Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` if needed. Tests inbox/read state, persistence, folders, filters, JD/salary/location, map opt-in and provider URL (mocked), portfolio evidence, safe import, apply navigation/manual status, skip/undo, partial salary bounds, profile constraints, tier conversion from legacy jobs, phone focus isolation, five viewport widths, and the standalone artifact with networking disabled. The managed browser blocks `file://` navigation; the artifact is rendered directly for its offline check without changing browser policy.

The design check additionally exercises pointer tracking and blinking, contextual expressions, waiting state, touch and reduced-motion behaviour, normal-text contrast on representative inbox/detail controls, and seven widths from 320–1440 px. It is not a complete accessibility audit or a live Maps availability test.

## Files

- `src/main.js`: inbox, detail, settings, local state, interactions.
- `src/mascot.js`: live vector face, bounded pupil tracking, expressions, and motion preferences.
- `src/tiers.js`: qualitative role-fit rules and S/A/B/C meanings.
- `src/assessment.js`: input validation, URL validation, keyword assessment.
- `src/data.js`: draft profile, evidence, labelled fictional jobs.
- `src/style.css`: responsive interface.
- `public/portfolio/`: seven project previews, no contact page.
- `docs/memory/`: career context and draft portfolio evidence.
- `scripts/`: reproducible standalone export and browser smoke checks.

Next integration: validate real matching, connect accessible discovery sources and a scheduler/database, then add AI and inspect the existing Notion schema before syncing.
