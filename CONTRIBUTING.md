# Working together comfortably

Use one GitHub repository, three local clones, and a short branch for each task. Do not share a working folder or commit directly to main during team development.

## Suggested three-person split

1. **Frontend owner:** `components/auditor.tsx`, `app/globals.css`. Own upload feedback, responsive layout, accessibility, report controls and visual presentation.
2. **Backend / audit owner:** `lib/audit/`, `app/api/`, `lib/server-config.ts`. Own parsing, marks, numbering, coverage, API validation and the optional AI adapter.
3. **Quality / integration owner:** `tests/`, `lib/pdf.ts`, `lib/report.ts`, `public/samples/`, documentation and CI. Own real-paper fixtures, PDF extraction, exports, regression tests and the demo.

If you are a fourth contributor, coordinate integration and review. Otherwise one of the three rotates as integrator. Ownership is coordination, not an editing restriction. Agree before changing someone else's active files; keep the shared contract `lib/audit/types.ts` stable.

## First GitHub setup (repository owner)

This checkout is Git-ready. A GitHub repository has not been created automatically because no GitHub account connection is available here.

1. On GitHub create an **empty private repository** called `paperlens-auditor` (skip adding a README or .gitignore).
2. Open a terminal in this project. If working from the ZIP, run `git init -b main`, `git add .`, and `git commit -m "Initial Paperlens MVP"` first.
3. Connect and push:

```sh
git remote add github https://github.com/YOUR_USERNAME/paperlens-auditor.git
git push -u github main
```

The remote name `github` avoids colliding with any existing Sites source remote. Replace YOUR_USERNAME. Use GitHub Desktop if you prefer: add this local repository, publish privately, then use the Branch and Pull Request menus.

4. In repository Settings → Collaborators, invite your three collegemates by their GitHub usernames.
5. Each teammate clones the GitHub repository and runs `npm ci` and `npm run dev`.
6. Where supported by your GitHub plan, protect `main`: require a pull request, one approval and the `check` CI job.

## Every task

```sh
git switch main
git pull
git switch -c feature/your-small-task
# Make and check your change.
npm test
npm run typecheck
git add path/to/changed-file
git commit -m "Describe the useful change"
git push -u github feature/your-small-task
```

Teammates whose clone uses the default remote name `origin` should use `origin` instead of `github`. Open a pull request, ask one teammate to review it, and squash-merge it after the checks pass. Everyone pulls main before starting the next task. Never force-push main.

## First sprint tasks

- Frontend: add inline classification corrections with a visible manual-override label.
- Backend: support section-level numbering and explicit optional-question groups without double-counting marks.
- Quality: collect 5 anonymized text-based papers, label expected findings manually, and add regression fixtures. Document unsupported layouts.

Each task should have one owner, a concrete acceptance criterion and a small pull request. Avoid editing `package.json` simultaneously; tell teammates before adding a dependency and commit its lockfile too.

## Secrets and documents

`.env` and local runtime files are ignored. Use `.env.example` to document new settings without values. Do not commit real exam papers or API keys. The app does not save papers, so refreshing loses the current inputs; download the audit when needed.
