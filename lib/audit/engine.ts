import { BLOOMS, type AuditInput, type AuditReport, type Bloom, type Mapping, type Question } from './types';

const verbs: [Bloom, RegExp][] = [
  ['Create', /\b(design|develop|create|construct|compose|formulate)\b/i],
  ['Evaluate', /\b(evaluate|justify|critique|assess|recommend|defend)\b/i],
  ['Analyze', /\b(analy[sz]e|compare|differentiate|contrast|examine)\b/i],
  ['Apply', /\b(apply|calculate|solve|implement|compute|demonstrate|execute|use|find|trace)\b/i],
  ['Understand', /\b(explain|describe|summari[sz]e|illustrate|discuss|interpret)\b/i],
  ['Remember', /\b(define|list|state|name|recall|identify|what is|what are)\b/i],
];
export function parseMapping(text: string): Mapping {
  const result: Mapping = { units: [], cos: [] };
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(unit|co)\s*(\d+)\s*[:.\-]\s*(.+)/i);
    if (!m) continue;
    const bucket = m[1].toLowerCase() === 'unit' ? result.units : result.cos;
    const label = (m[1].toLowerCase() === 'unit' ? 'Unit ' : 'CO') + Number(m[2]);
    const keywords = m[3].toLowerCase().split(/[,;]+/).map(x => x.trim()).filter(Boolean);
    const existing = bucket.find(x => x.label === label);
    if (existing) existing.keywords.push(...keywords); else bucket.push({ label, keywords });
  }
  return result;
}
function inferMapping(text: string, items: Mapping['units']): string | null {
  const ranked = items.map(x => ({ label: x.label, score: x.keywords.filter(k => text.toLowerCase().includes(k)).length })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score && ranked[0].score > (ranked[1]?.score ?? 0) ? ranked[0].label : null;
}
export function parseQuestions(text: string, mapping: Mapping): Question[] {
  const chunks: { number: number; lines: string[] }[] = [];
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const m = line.match(/^\s*(?:Q(?:uestion)?\s*\.?\s*(\d{1,3})\s*[.):\-]?|([1-9]\d{0,2})\s*[.):])\s+(.+)$/i);
    if (m) chunks.push({ number: Number(m[1] ?? m[2]), lines: [m[3]] });
    else if (chunks.length && !/^\s*(?:page\s+\d|section\s+[A-Z]|part\s+[A-Z])/i.test(line)) chunks.at(-1)!.lines.push(line);
  }
  if (!chunks.length) throw new Error('No numbered questions found. Use Q1. Question text [5 marks], with each question on a new line.');
  if (chunks.length > 200) throw new Error('Please audit no more than 200 questions at a time.');
  return chunks.map((chunk, index) => {
    const raw = chunk.lines.join(' ').trim();
    const markMatches = [...raw.matchAll(/\[\s*(\d+(?:\.\d+)?)\s*(?:marks?|m)?\s*\]|\(\s*(\d+(?:\.\d+)?)\s*marks?\s*\)|\b(\d+(?:\.\d+)?)\s*marks?\b/gi)];
    const endMarks = raw.match(/\(\s*(\d+(?:\.\d+)?)\s*\)\s*$/);
    const marks = markMatches.length === 1 ? Number(markMatches[0][1] ?? markMatches[0][2] ?? markMatches[0][3]) : !markMatches.length && endMarks ? Number(endMarks[1]) : null;
    const unit = raw.match(/\[\s*unit\s*(\d+)\s*\]/i), co = raw.match(/\[\s*co\s*(\d+)\s*\]/i);
    const clean = raw.replace(/\[\s*(?:\d+(?:\.\d+)?\s*(?:marks?|m)?|unit\s*\d+|co\s*\d+)\s*\]|\(\s*\d+(?:\.\d+)?\s*(?:marks?)?\s*\)\s*$|\b\d+(?:\.\d+)?\s*marks?\b/gi, '').trim();
    const bloom = verbs.find(([, pattern]) => pattern.test(clean.slice(0, 100)))?.[0] ?? 'Unclassified';
    return { id: `q-${index + 1}`, number: chunk.number, text: clean, marks, unit: unit ? `Unit ${Number(unit[1])}` : inferMapping(clean, mapping.units), co: co ? `CO${Number(co[1])}` : inferMapping(clean, mapping.cos), bloom, basis: 'Rules: command verbs, inline tags and syllabus keywords; review classification.' };
  });
}
export function normalize(text: string): string { return text.normalize('NFKC').toLowerCase().replace(/[.,!?;:]+(?=\s|$)/g, '').replace(/\s+/g, ' ').trim(); }
function tokens(text: string): Set<string> {
  return new Set(normalize(text.replace(/breadth[ -]first search/gi, 'bfs').replace(/depth[ -]first search/gi, 'dfs').replace(/\b(explain|describe|discuss)\b/gi, '').replace(/\b(working|operates|operation)\b/gi, 'operation')).split(' ').filter(x => !['the', 'a', 'an', 'of', 'how', 'is', 'and', 'in', 'to', 'with'].includes(x)));
}
export function audit(input: AuditInput, classified?: Question[]): AuditReport {
  const mapping = parseMapping(input.syllabus);
  const questions = classified ?? parseQuestions(input.text, mapping);
  const issues: AuditReport['issues'] = [];
  const add = (severity: 'error' | 'warning', title: string, detail: string, action: string, ids: string[] = []) => issues.push({ id: `issue-${issues.length + 1}`, severity, title, detail, action, questions: ids });
  const totalMarks = questions.reduce((n, q) => n + (q.marks ?? 0), 0);
  const marksComplete = questions.every(q => q.marks !== null);
  if (!marksComplete) add('warning', 'Some marks could not be read', 'The marks total is partial. Multiple marks in a question are treated as ambiguous.', 'Add one explicit [5 marks] value per question or review subparts.', questions.filter(q => q.marks === null).map(q => q.id));
  else if (totalMarks !== input.expectedMarks) add('error', 'Total marks do not match', `Detected ${totalMarks} marks; expected ${input.expectedMarks}.`, 'Check each question’s marks and the expected total.');
  const seen = new Map<number, Question>();
  for (const q of questions) {
    if (seen.has(q.number)) add('error', 'Question number is repeated', `Q${q.number} appears more than once.`, 'Give every question a unique number.', [seen.get(q.number)!.id, q.id]);
    seen.set(q.number, q);
  }
  const upper = input.expectedQuestions ?? Math.max(...questions.map(q => q.number));
  const missing = Array.from({ length: upper }, (_, i) => i + 1).filter(n => !seen.has(n));
  if (missing.length) add('error', 'Question numbering has a gap', `${missing.map(n => `Q${n}`).join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing from the sequence.`, 'Restore the missing question or renumber the paper.');
  if (input.expectedQuestions && questions.length !== input.expectedQuestions) add('warning', 'Question count does not match', `${questions.length} questions found; expected ${input.expectedQuestions}.`, 'Check missing, extra or incorrectly parsed questions.');
  if (questions.some((q, i) => i && q.number < questions[i - 1].number)) add('warning', 'Question order needs review', 'The question numbers are not in ascending order.', 'Check the extraction order or section numbering.');
  for (let i = 0; i < questions.length; i++) for (let j = i + 1; j < questions.length; j++) {
    const a = questions[i], b = questions[j];
    const exact = normalize(a.text) === normalize(b.text);
    const ta = tokens(a.text), tb = tokens(b.text);
    const overlap = [...ta].filter(t => tb.has(t)).length;
    const similar = ta.size >= 3 && tb.size >= 3 && overlap / new Set([...ta, ...tb]).size >= .8;
    if (exact || similar) add(exact ? 'error' : 'warning', exact ? 'Duplicate question detected' : 'Possible overlapping questions', `Q${a.number} and Q${b.number} ${exact ? 'contain the same question text' : 'share very similar wording (a rule-based suggestion)'}.`, 'Review both questions and replace one if they test the same learning outcome.', [a.id, b.id]);
  }
  const apply = questions.filter(q => q.bloom === 'Apply').length / questions.length * 100;
  if (apply < input.minApply) add('warning', 'Low Apply-level coverage', `${apply.toFixed(1)}% of questions are classified as Apply; the chosen minimum is ${input.minApply}%.`, 'Consider a problem-solving or implementation question. This threshold is your setting, not a university standard.');
  const unknown = questions.filter(q => q.bloom === 'Unclassified');
  if (unknown.length) add('warning', 'Bloom classification needs review', `${unknown.length} questions could not be classified from their command verbs.`, 'Review the wording or enable AI-assisted classification.', unknown.map(q => q.id));
  for (const [key, entries] of [['unit', mapping.units], ['co', mapping.cos]] as const) {
    if (entries.length) {
      const absent = entries.filter(e => !questions.some(q => q[key] === e.label));
      if (absent.length) add('warning', `${key === 'unit' ? 'Unit' : 'CO'} coverage is incomplete`, `${absent.map(e => e.label).join(', ')} have no mapped questions.`, 'Check the mappings, then add questions if coverage is required.');
      const unmapped = questions.filter(q => !q[key] || !entries.some(e => e.label === q[key]));
      if (unmapped.length) add('warning', `${key === 'unit' ? 'Unit' : 'CO'} mapping needs review`, `${unmapped.length} questions have no valid mapping in the supplied syllabus.`, 'Add explicit [Unit 1] and [CO1] tags or improve the syllabus keywords.', unmapped.map(q => q.id));
    }
  }
  if (/\b(?:answer|attempt)\s+(?:any|either)|^\s*or\s*$|\b(?:either|internal choice)\b/im.test(input.text) || /^\s*(?:\(?[a-z]\)|\d+\s*\([a-z]\))/im.test(input.text)) add('warning', 'Choice or subpart structure needs review', 'This MVP sums listed questions. It does not calculate optional-question combinations or nested section totals.', 'Verify the eligible marks manually and flatten subparts before relying on this report.');
  const notes = ['Distributions count questions, not marks. Classifications are suggestions for an examiner to review.', 'Numbering gaps are checked from 1 through the highest detected number unless an expected count is provided.'];
  if (!mapping.units.length || !mapping.cos.length) notes.push('Full unit/CO coverage cannot be verified without the corresponding syllabus mapping. Inline tags only describe mapped questions.');
  return { filename: input.filename, createdAt: new Date().toISOString(), mode: 'rules', questions, issues, mapping, totalMarks, expectedMarks: input.expectedMarks, marksComplete, minApply: input.minApply, status: issues.length ? 'Needs review' : 'Checks passed', notes };
}
export function distribution(report: AuditReport) { return BLOOMS.map(label => ({ label, count: report.questions.filter(q => q.bloom === label).length, percent: report.questions.filter(q => q.bloom === label).length / report.questions.length * 100 })); }
