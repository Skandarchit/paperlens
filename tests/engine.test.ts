import test from 'node:test';
import assert from 'node:assert/strict';
import { audit, parseMapping, parseQuestions, distribution } from '../lib/audit/engine';
import { SAMPLE_INPUT } from '../lib/audit/sample';
import { auditInputSchema, readBoundedJSON } from '../lib/audit/validation';
import { reportHTML } from '../lib/report';

test('demo audit finds exactly the three intended issues and 60 marks', () => {
  const report = audit(SAMPLE_INPUT);
  assert.equal(report.questions.length, 12); assert.equal(report.totalMarks, 60);
  assert.equal(report.issues.length, 3);
  assert.ok(report.issues.some(i => i.detail.includes('Q8')));
  assert.ok(report.issues.some(i => i.title === 'Duplicate question detected'));
  assert.ok(report.issues.some(i => i.title === 'Low Apply-level coverage'));
  assert.equal(report.mapping.units.length, 5);
  assert.ok(Math.abs(distribution(report).reduce((n, d) => n + d.percent, 0) - 100) < .001);
});
test('a corrected paper passes all enabled checks', () => {
  const r = audit({ ...SAMPLE_INPUT, text: 'Q1. Apply binary search to find 4. [5 marks]', syllabus: 'Unit 1: binary search\nCO1: binary search', expectedMarks: 5 });
  assert.equal(r.status, 'Checks passed'); assert.deepEqual(r.issues, []);
});
test('wrapped lines and common question prefixes parse', () => {
  const q = parseQuestions('Question 1: Explain a queue\nwith an example. (5 marks)\n2) Define a stack. [3]\nQ3. Apply search. (2)', parseMapping(''));
  assert.deepEqual(q.map(q => q.marks), [5, 3, 2]); assert.match(q[0].text, /with an example/);
});
test('missing marks remain unknown and never produce a pass', () => {
  const r = audit({ ...SAMPLE_INPUT, text: 'Q1. Define a stack.', syllabus: '', minApply: 0 });
  assert.equal(r.marksComplete, false); assert.equal(r.questions[0].marks, null); assert.equal(r.status, 'Needs review');
});
test('marks mismatch, repeated numbers and choice instructions are flagged', () => {
  const r = audit({ ...SAMPLE_INPUT, text: 'Answer any one question.\nQ1. Define a stack. [5 marks]\nQ1. Define a queue. [5 marks]', syllabus: '' });
  for (const title of ['Total marks do not match', 'Question number is repeated', 'Choice or subpart structure needs review']) assert.ok(r.issues.some(i => i.title === title));
});
test('optional syllabus never invents full coverage and keyword ties remain unmapped', () => {
  const r = audit({ ...SAMPLE_INPUT, text: 'Q1. Define an array. [5 marks]', syllabus: '' });
  assert.equal(r.questions[0].unit, null); assert.equal(r.mapping.units.length, 0);
  const q = parseQuestions('Q1. Explain arrays. [5 marks]', parseMapping('Unit 1: arrays\nUnit 2: arrays'));
  assert.equal(q[0].unit, null);
});
test('multiple mark values are ambiguous and explicit count detects trailing omissions', () => {
  const r = audit({ ...SAMPLE_INPUT, text: 'Q1. Define a tree. [2 marks] Explain a tree. [3 marks]', syllabus: '', expectedQuestions: 2 });
  assert.equal(r.questions[0].marks, null); assert.ok(r.issues.some(i => i.detail.includes('Q2')));
});
test('empty extraction, overlong requests and invalid settings fail validation', async () => {
  assert.throws(() => audit({ ...SAMPLE_INPUT, text: 'No questions here' }), /No numbered/);
  assert.equal(auditInputSchema.safeParse({ ...SAMPLE_INPUT, minApply: 101 }).success, false);
  assert.equal(auditInputSchema.safeParse({ ...SAMPLE_INPUT, expectedMarks: -1 }).success, false);
  assert.equal(auditInputSchema.safeParse({ ...SAMPLE_INPUT, text: 'a'.repeat(60001) }).success, false);
  await assert.rejects(readBoundedJSON(new Request('http://test/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(512001) })), /too large/);
});
test('downloaded reports escape uploaded markup', () => {
  const r = audit({ ...SAMPLE_INPUT, filename: '<img src=x onerror=alert(1)>', text: 'Q1. Explain <script>alert(1)</script>. [5 marks]' });
  const html = reportHTML(r);
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img src=x')); assert.ok(html.includes('&lt;script&gt;'));
});
test('mathematical operators and non-Latin text are not erased for exact duplicate checks', () => {
  const r = audit({ ...SAMPLE_INPUT, text: 'Q1. Solve x+y=3. [5 marks]\nQ2. Solve x-y=3. [5 marks]\nQ3. பொருள் ஒன்று [5 marks]\nQ4. பொருள் இரண்டு [5 marks]', syllabus: '' });
  assert.ok(!r.issues.some(i => i.title === 'Duplicate question detected'));
});
