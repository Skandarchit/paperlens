// PDF parsing stays in the browser. The backend receives reviewed text only.
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
export function pageText(items: TextItem[]): string {
  let previousY: number | null = null, line = '', result = '';
  for (const item of items) {
    const y = item.transform[5];
    if (previousY !== null && Math.abs(y - previousY) > 3 && line) { result += line.trim() + '\n'; line = ''; }
    line += item.str + ' '; previousY = y;
    if (item.hasEOL) { result += line.trim() + '\n'; line = ''; previousY = null; }
  }
  return result + line.trim();
}
export async function extractFile(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Please choose a file smaller than 10 MB.');
  if (!/\.(pdf|txt)$/i.test(file.name)) throw new Error('Choose a PDF or TXT file.');
  if (!file.size) throw new Error('This file is empty. Choose another document.');
  if (/\.txt$/i.test(file.name)) { const text = await file.text(); if (text.length > 60000) throw new Error('Please use no more than 60,000 characters.'); return text; }
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  let document;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try { document = await loadingTask.promise; }
  catch { await loadingTask.destroy(); throw new Error('This PDF could not be opened. Check that it is valid and not password-protected.'); }
  try {
    if (document.numPages > 50) throw new Error('Please use a PDF with 50 pages or fewer.');
    const pages: string[] = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i), content = await page.getTextContent();
      pages.push(pageText(content.items.filter((item): item is TextItem => 'str' in item))); page.cleanup();
      if (pages.join('\n').length > 60000) throw new Error('Extracted text exceeds 60,000 characters. Split the document into smaller papers.');
    }
    const text = pages.join('\n\n').trim();
    if (text.length < 20) throw new Error('No usable text found. This may be a scanned PDF. Use a text-based PDF or paste OCR text.');
    return text;
  } finally { await loadingTask.destroy(); }
}
