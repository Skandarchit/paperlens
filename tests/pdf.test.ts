import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { pageText, extractFile } from '../lib/pdf';
import { audit } from '../lib/audit/engine';
import { SAMPLE_INPUT } from '../lib/audit/sample';

test('real sample PDF extraction reaches the same audit as the text fixture', async () => {
  const task = getDocument({ data: new Uint8Array(await readFile('public/samples/question-paper.pdf')), useSystemFonts: true });
  try {
    const doc = await task.promise; const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) { const page = await doc.getPage(i), content = await page.getTextContent(); pages.push(pageText(content.items.filter((item): item is TextItem => 'str' in item))); }
    const r = audit({ ...SAMPLE_INPUT, text: pages.join('\n') });
    assert.equal(r.questions.length, 12); assert.equal(r.totalMarks, 60); assert.equal(r.issues.length, 3);
  } finally { await task.destroy(); }
});
test('uploads reject unsupported files and oversized text', async () => {
  await assert.rejects(extractFile(new File(['test'], 'exam.docx')), /PDF or TXT/);
  await assert.rejects(extractFile(new File([], 'empty.pdf')), /empty/);
  await assert.rejects(extractFile(new File(['a'.repeat(60001)], 'paper.txt')), /60,000/);
});
