# Paperlens — Question Paper Quality Auditor

A working university-style MVP for a three-person college project. Upload a question paper, optionally add a syllabus/CO mapping, and get an actionable quality report.

## Run it

Install **Node.js 24 LTS**, then open this project folder in VS Code:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Click **Try sample paper** for the built-in demo. No API key, database or login setup is required. Stop the server with Ctrl+C.

## What works

- PDF/TXT upload and editable extraction. PDF text is read in your browser.
- Marks totals, repeated/missing numbering, exact duplicates and limited wording-overlap suggestions.
- Unit and CO coverage against a supplied mapping.
- Bloom taxonomy suggestions and an adjustable minimum Apply percentage.
- Expandable findings, a complete question breakdown and audit notes.
- Downloadable HTML report with a **Print / Save as PDF** button.
- Optional server-side OpenAI review for semantic duplicates and contextual classification.
- Sample PDF, sample syllabus, automated tests and GitHub pull request checks.

The initial dashboard is explicitly labeled **DEMO**. **Try sample paper** runs the same backend used for uploads. The sample has 12 questions, 60 marks, all five units, and three deliberate findings: Q8 missing, Q2/Q11 duplicated, and 8.3% Apply coverage below the default 20% threshold.

## Your three-person team

1. **Interface:** upload controls, dashboard, responsiveness and accessibility.
2. **Backend:** parsing, rules, syllabus mapping and the AI adapter.
3. **Testing and integration:** PDF handling, reports, test fixtures, CI and demo.

See [CONTRIBUTING.md](CONTRIBUTING.md) for exact ownership areas, GitHub setup, collaborator invitations, branches, pull requests and starter tasks. This project includes a local Git history and GitHub workflow files. A repository in your GitHub account still needs to be created and connected; it is not automatically published to GitHub.

## Simple architecture

**React + TypeScript frontend → one JSON API → audit functions → visual report.**

The app uses Vinext/Vite to run the interface and Next-style backend routes in one process. It can also build a Cloudflare Worker for hosting. PDF.js extracts text, Zod checks input, and ordinary TypeScript functions perform the audit. You do not need Express, a database, authentication, model training or separate frontend/backend servers for this iteration.

```text
components/auditor.tsx     Main interface
app/globals.css           Visual design
app/api/audit/route.ts     POST endpoint
app/api/health/route.ts    Server / AI availability
lib/audit/engine.ts        Parser and audit checks
lib/audit/ai.ts            Optional OpenAI adapter
lib/audit/types.ts         Shared frontend/backend contract
lib/pdf.ts                Browser PDF extraction
lib/report.ts             Report export
tests/                    Audit and AI contract tests
public/samples/           Demo PDF, question text and syllabus
```

The scaffold also contains existing UI controls and hosting helpers; start with the files above. [Architecture and API details](docs/ARCHITECTURE.md) explain the implementation and limits. [Demo script](docs/DEMO.md) provides a two-minute judge presentation.

## Optional AI setup

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` to your own key, choose a supported `OPENAI_MODEL`, and set `ENABLE_AI=true`.
3. Restart `npm run dev` and enable **AI-assisted review** in the interface.

The sample configuration names `gpt-4o-mini`; change it to a supported model available to your API project if needed. Keys remain server-side. AI calls may incur API charges. Question text and syllabus are sent only when the AI toggle is enabled. The app requests `store: false` for responses. For a hosted Site, configure the same keys as server environment variables/secrets; a local `.env` is not uploaded.

The AI adapter is tested with simulated responses, including refusal/incomplete/error paths. A live paid request has not been tested. Keep the rule mode available for the hackathon. If enabling a paid key on an openly accessible future deployment, add access/rate controls and configure provider usage limits first.

## Check and build

```sh
npm test
npm run typecheck
npm run build
```

To run the built Worker locally, use `npm start` and the address it prints. `predev` and `prebuild` copy the installed PDF worker into the public directory. Commit `package-lock.json` when changing packages. GitHub Actions runs install, type checks, tests and build on pull requests.

## Supported paper format and limitations

Use numbered questions such as `Q1. Define a stack. [5 marks]`. Each question must begin on a new line; wrapped body lines are supported. Inline mapping tags can be added as `[Unit 1] [CO1]`. Syllabus mapping uses one row per label, for example `Unit 1: arrays, lists` and `CO1: arrays, lists`.

Without AI, classification is a verb/keyword heuristic, not semantic understanding. Full syllabus coverage needs a supplied mapping. Scanned PDFs need OCR before upload. Optional choices, nested subparts, diagrams, multi-column layouts and section numbering resets require manual review. The parser never silently assigns marks to an unreadable question. Review all extracted text and marks before relying on a result.

Distributions count questions, not marks. Apply targets are configurable project rules, not official university standards. The report supports an examiner's review and does not certify correctness or compliance.

## Data

No application database or paper history is stored. Refreshing the page clears your inputs. Download the report if you want to keep it. Do not commit real exam papers or API keys to GitHub.
