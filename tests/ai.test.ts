import test from 'node:test';
import assert from 'node:assert/strict';
import { auditWithAI } from '../lib/audit/ai';
import { SAMPLE_INPUT } from '../lib/audit/sample';
import { audit } from '../lib/audit/engine';
const config = { key: 'test-only-not-a-key', model: 'test-model' };
const classifications = () => audit(SAMPLE_INPUT).questions.map(q => ({ id: q.id, bloom: q.bloom, unit: q.unit, co: q.co, reason: 'Test fixture' }));
const fixture = (data: unknown, status = 'completed') => (async () => Response.json({ status, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }] })) as typeof fetch;
test('AI adds reviewable semantic suggestions without changing marks or text', async () => {
  const r = await auditWithAI(SAMPLE_INPUT, config, fixture({ classifications: classifications(), duplicates: [{ first: 'q-1', second: 'q-3', reason: 'Mock semantic example' }] }));
  assert.equal(r.mode, 'ai'); assert.equal(r.totalMarks, 60); assert.equal(r.questions[0].text, audit(SAMPLE_INPUT).questions[0].text);
  assert.ok(r.issues.some(i => i.title === 'Possible semantic duplicate'));
});
test('AI rejects missing classifications, invented mappings and bad pairs', async () => {
  await assert.rejects(auditWithAI(SAMPLE_INPUT, config, fixture({ classifications: [], duplicates: [] })), /incomplete or inconsistent/);
  const c = classifications(); c[0].unit = 'Unit 999';
  await assert.rejects(auditWithAI(SAMPLE_INPUT, config, fixture({ classifications: c, duplicates: [] })), /incomplete or inconsistent/);
  await assert.rejects(auditWithAI(SAMPLE_INPUT, config, fixture({ classifications: classifications(), duplicates: [{ first: 'fake', second: 'q-1', reason: 'bad' }] })), /invalid duplicate/);
});
test('AI refuses malformed, truncated and failed responses', async () => {
  await assert.rejects(auditWithAI(SAMPLE_INPUT, config, fixture({}, 'incomplete')), /incomplete/);
  await assert.rejects(auditWithAI(SAMPLE_INPUT, config, fixture({})), /invalid review/);
  await assert.rejects(auditWithAI(SAMPLE_INPUT, config, (async () => new Response('', { status: 429 })) as typeof fetch), /HTTP 429/);
});
test('AI request uses a bounded schema and never stores the response', async () => {
  await auditWithAI(SAMPLE_INPUT, config, (async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.properties.classifications.items.properties.id.enum.length, 12);
    return fixture({ classifications: classifications(), duplicates: [] })(url, init);
  }) as typeof fetch);
});
