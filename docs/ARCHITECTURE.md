# How the MVP works

The interface is a React component. It sends a JSON request to one backend endpoint. The backend returns one typed audit object. No database, login system or user roles are needed.

```text
PDF / TXT
  → browser PDF.js extraction
  → editable question text + optional syllabus
  → POST /api/audit
  → validate → parse → deterministic checks
  → optional OpenAI classification + semantic comparison
  → rerun checks against the classifications
  → React dashboard → downloadable HTML / print to PDF
```

## Tools

- **React + TypeScript:** frontend components and shared data types. TypeScript adds checks to JavaScript, helping teammates agree on the same question/report structure.
- **CSS + existing Radix/shadcn controls:** layout and accessible tabs/toggles. No design tool account is needed.
- **Vinext + Vite:** runs the React app and Next-style API routes together. Development uses one command and one port. This scaffold also packages the backend as a Cloudflare Worker for Sites. It is more infrastructure than plain Express, but the application code remains separated into a UI, pure audit functions and small route handlers.
- **PDF.js:** reads PDF text in the browser, with a worker served from the same site. TXT is also supported.
- **Zod:** validates the request and AI response shapes.
- **Node's test runner + tsx:** runs the TypeScript tests without a separate testing framework.
- **GitHub Actions:** installs the locked dependencies, checks types, runs tests and builds every pull request.

The application currently keeps no database or audit history. Files are parsed in memory; only the reviewed text is sent to the backend. If AI is selected, question text and syllabus are sent to OpenAI with response storage disabled. Hosting/provider policies are separate from application storage.

## API contract

`GET /api/health` returns `{ status: "ok", aiAvailable: boolean }`; no key is returned.

`POST /api/audit` accepts:

```json
{
  "text": "Q1. Define a stack. [5 marks]",
  "syllabus": "Unit 1: stack\nCO1: stack",
  "filename": "Example paper",
  "expectedMarks": 5,
  "expectedQuestions": 1,
  "minApply": 20,
  "useAI": false
}
```

Success: `AuditReport` in `lib/audit/types.ts`. Failures return `{ error: string }` and HTTP 400 (invalid input), 503 (AI disabled), or 502 (AI review failed). A failed run preserves the previous report and displays an error. Uploaded content is escaped in downloaded reports.

## Limits

- 10 MB per file, 50 PDF pages; 60,000 characters per text field; 200 parsed questions.
- AI: at most 60 questions and 24,000 combined text characters, one bounded request with a timeout.
- The parser supports `Q1.`, `Question 1:`, `1.`, `1)` and simple wrapped question text. Marks: `[5 marks]`, `[5]`, `(5 marks)` or trailing `(5)`.
- A numeric square-bracket value can be mistaken for a mark; always review extracted marks, especially mathematics/programming papers. Multiple mark values remain unknown instead of being summed blindly.
- Unit/CO mapping lines use `Unit 1: arrays, lists` and `CO1: arrays, lists`. Inline tags `[Unit 1] [CO1]` override keyword guesses. Free-form syllabi should be normalized into these lines. Unmatched/tied mappings remain unknown.
- Scanned papers need OCR elsewhere. Images/diagrams, multi-column extraction, nested subparts, repeated section numbering and internal choices require manual review. The MVP sums listed questions, not optional combinations.
- Numbering begins at 1. The highest detected number supplies the range unless an expected count is entered; trailing omissions cannot be inferred without that count.
- Bloom/CO percentages count questions, not marks. The Apply threshold is user-selected, not an institutional standard.
- Without a syllabus, the dashboard cannot verify completeness of unit/CO coverage; it only reports available tags.

## Optional browser agent tools

On browsers supporting `document.modelContext`, `load_sample_audit` runs the same sample action and `read_current_audit` reads the visible result. Both take an empty object; loading the sample replaces inputs. Unsupported browsers skip registration. Live WebMCP validation was not available during creation, so this optional integration is not claimed as verified.

## References

- [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

AI integration tests use simulated responses; a live call still needs an API key and has not been verified here.
