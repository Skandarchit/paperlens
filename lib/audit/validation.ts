import { z } from 'zod';
export const auditInputSchema = z.object({
  text: z.string().trim().min(10, 'Enter at least one numbered question.').max(60000),
  syllabus: z.string().max(60000).default(''),
  expectedMarks: z.number().finite().positive().max(10000),
  expectedQuestions: z.number().int().min(1).max(200).nullable().default(null),
  minApply: z.number().finite().min(0).max(100).default(20),
  filename: z.string().trim().min(1).max(200).default('Question paper'),
  useAI: z.boolean().default(false),
});
export async function readBoundedJSON(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('Send the audit as JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('The request is empty.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 512000) { await reader.cancel(); throw new Error('The request is too large. Use shorter documents.'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const merged = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(merged)); } catch { throw new Error('The request contains invalid JSON.'); }
}
