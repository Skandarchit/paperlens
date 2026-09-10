'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, CircleAlert, FileText, FlaskConical, GraduationCap, Layers3, LoaderCircle, ScanLine, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { audit, distribution } from '@/lib/audit/engine';
import { SAMPLE_INPUT, SAMPLE_PAPER, SAMPLE_SYLLABUS } from '@/lib/audit/sample';
import type { AuditInput, AuditReport } from '@/lib/audit/types';
import { extractFile } from '@/lib/pdf';
import { downloadReport } from '@/lib/report';

const COLORS = ['#bdd8ca', '#77b397', '#dfb166', '#318369', '#185b4b', '#133e34', '#a3a9ad'];
export default function Auditor() {
  const [text, setText] = useState(''), [syllabus, setSyllabus] = useState('');
  const [filename, setFilename] = useState(''), [syllabusName, setSyllabusName] = useState('');
  const [marks, setMarks] = useState('60'), [count, setCount] = useState(''), [minApply, setMinApply] = useState('20');
  const [report, setReport] = useState<AuditReport>(() => ({ ...audit(SAMPLE_INPUT), createdAt: '2026-01-01T00:00:00Z' }));
  const [demo, setDemo] = useState(true), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [aiAvailable, setAiAvailable] = useState(false), [useAI, setUseAI] = useState(false), [tab, setTab] = useState('overview');
  const [dragging, setDragging] = useState(false);
  const paperRef = useRef<HTMLInputElement>(null), syllabusRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { fetch('/api/health').then(r => r.json()).then(d => setAiAvailable((d as { aiAvailable?: boolean }).aiAvailable === true)).catch(() => {}); }, []);
  async function loadFile(file: File | undefined, mapping = false) {
    if (!file || busy) return;
    setBusy('Reading document'); setError('');
    try {
      const value = await extractFile(file);
      if (mapping) { setSyllabus(value); setSyllabusName(file.name); }
      else { setText(value); setFilename(file.name); }
      setDirty(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'The file could not be read.'); }
    finally { setBusy(''); if (paperRef.current) paperRef.current.value = ''; if (syllabusRef.current) syllabusRef.current.value = ''; }
  }
  async function runAudit(override?: AuditInput) {
    if (busy) return;
    const input = override ?? { text, syllabus, filename: filename || 'Pasted question paper', expectedMarks: Number(marks), expectedQuestions: count ? Number(count) : null, minApply: Number(minApply), useAI };
    if (!input.text.trim()) { setError('Upload a paper or paste its question text first.'); return; }
    if (!override && (!marks.trim() || !minApply.trim())) { setError('Enter expected marks and the minimum Apply percentage.'); return; }
    setBusy(input.useAI ? 'Reviewing with AI' : 'Auditing your paper'); setError('');
    try {
      const response = await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(70000) });
      const data = await response.json() as AuditReport & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Audit failed. Please try again.');
      setReport(data); setDemo(!!override); setDirty(false); setTab('overview');
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return data;
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect to the audit server.'); }
    finally { setBusy(''); }
  }
  function sample() {
    setText(SAMPLE_PAPER); setSyllabus(SAMPLE_SYLLABUS); setFilename('Data Structures · Semester IV'); setSyllabusName('Sample syllabus');
    setMarks('60'); setCount(''); setMinApply('20'); setUseAI(false); setDirty(true); return runAudit(SAMPLE_INPUT);
  }
  const actions = useRef({ sample, report });
  actions.current = { sample, report };
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<typeof context.registerTool>[0]) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
    const validateEmpty = (input: unknown) => { if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('This tool takes an empty object.'); };
    register({ name: 'load_sample_audit', description: 'Load the example question paper, run its rule audit and display the result. Replaces the current inputs.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => { validateEmpty(input); const data = await actions.current.sample(); if (!data) throw new Error('Sample audit could not complete. Check the visible error or wait for the current audit.'); await new Promise(resolve => requestAnimationFrame(resolve)); return { status: data.status, questions: data.questions.length, issues: data.issues }; } });
    register({ name: 'read_current_audit', description: 'Read the currently displayed audit report. Does not rerun the audit.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: input => { validateEmpty(input); return actions.current.report; } });
    return () => lifecycle.abort();
  }, []);
  const dist = distribution(report);
  const covered = report.mapping.units.filter(u => report.questions.some(q => q.unit === u.label)).length;
  const errors = report.issues.filter(i => i.severity === 'error').length;
  return <div className="application">
    <header className="topbar"><a href="/" className="brand"><span className="brand-icon"><ScanLine size={23} /></span>paperlens<span className="brand-divider" /><span className="brand-sub">Academic quality workspace</span></a><span className="edition"><GraduationCap size={17} /> Built for better assessments <span className="version">MVP 01</span></span></header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow">ASSESSMENT REVIEW / QUESTION PAPERS</div><h1>Every question deserves a second look.</h1><p>Check the structure, balance and coverage of your next question paper.</p></div><button className="button secondary sample-button" onClick={sample} disabled={!!busy}><FlaskConical size={17} /> Try sample paper</button></div>
      <div className="workspace-grid">
        <aside className="input-column">
          <section className="panel input-panel"><div className="section-heading"><span className="step">01</span><h2>Your documents</h2></div>
            <label className={`dropzone ${dragging ? 'dragging' : ''} ${text ? 'has-file' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void loadFile(e.dataTransfer.files[0]); }}>
              <input ref={paperRef} type="file" accept=".pdf,.txt" onChange={e => void loadFile(e.target.files?.[0])} disabled={!!busy} className="sr-only" aria-label="Upload question paper PDF or text" />
              <span className="upload-icon">{text ? <FileText size={25} /> : <Upload size={25} />}</span><strong>{filename || 'Drop your question paper here'}</strong><span>{text ? 'Click to replace your document' : 'or click to browse files'}</span><small>PDF or TXT · up to 10 MB · 50 pages</small>
            </label>
            <details className="text-details" open={text ? true : undefined}><summary>{text ? 'Review & edit extracted text' : 'Or paste question text'}</summary><label htmlFor="paper-text" className="helper">One question per line. Example: Q1. Define a stack. [5 marks]</label><textarea id="paper-text" value={text} onChange={e => { setText(e.target.value); setDirty(true); }} placeholder="Q1. Define a stack. [5 marks]" rows={6} disabled={!!busy} /></details>
            <div className="mapping-heading"><label htmlFor="syllabus-text">Syllabus / CO mapping</label><span className="optional">Optional</span></div>
            <button className="mapping-upload" onClick={() => syllabusRef.current?.click()} disabled={!!busy}><Layers3 size={18} /><span>{syllabusName || 'Add syllabus or outcome mapping'}</span><span>+</span></button><input ref={syllabusRef} type="file" accept=".pdf,.txt" onChange={e => void loadFile(e.target.files?.[0], true)} hidden />
            <details className="text-details"><summary>{syllabus ? 'Edit syllabus mapping' : 'Paste a mapping'}</summary><label className="helper" htmlFor="syllabus-text">Use one row per unit or outcome: Unit 1: arrays, lists or CO1: arrays, lists.</label><textarea id="syllabus-text" value={syllabus} rows={5} disabled={!!busy} onChange={e => { setSyllabus(e.target.value); setDirty(true); }} placeholder={'Unit 1: arrays, linked lists\nCO1: arrays, linked lists'} />{syllabus && <button className="text-button" disabled={!!busy} onClick={() => { setSyllabus(''); setSyllabusName(''); setDirty(true); }}><X size={14} /> Remove mapping</button>}</details>
            <div className="section-heading settings-heading"><span className="step">02</span><h2>Audit settings</h2></div>
            <div className="form-grid"><label>Expected marks<input type="number" min="1" max="10000" value={marks} disabled={!!busy} onChange={e => { setMarks(e.target.value); setDirty(true); }} /></label><label>Question count<input type="number" min="1" max="200" placeholder="Auto" value={count} disabled={!!busy} onChange={e => { setCount(e.target.value); setDirty(true); }} /></label></div>
            <label className="apply-setting">Minimum Apply coverage<span><input aria-label="Minimum Apply coverage percent" type="number" min="0" max="100" value={minApply} disabled={!!busy} onChange={e => { setMinApply(e.target.value); setDirty(true); }} />%</span></label>
            <div className="ai-setting"><div><label htmlFor="ai-toggle"><Sparkles size={15} /> AI-assisted review</label><small>{aiAvailable ? 'Sends question text and syllabus to OpenAI' : 'Optional · enable with a server API key'}</small></div><Switch id="ai-toggle" checked={useAI} disabled={!aiAvailable || !!busy} onCheckedChange={v => { setUseAI(v); setDirty(true); }} /></div>
            {error && <div className="form-error" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
            <button className="button primary run-button" onClick={() => void runAudit()} disabled={!!busy || !text.trim()}>{busy ? <LoaderCircle size={18} className="spin" /> : <ScanLine size={18} />}{busy || 'Run quality audit'}{!busy && <ArrowRight size={18} />}</button><p className="privacy-note"><ShieldCheck size={14} /> Documents are not saved by Paperlens.</p>
          </section>
          <div className="support-note"><span className="tiny-label">A LITTLE PREPARATION GOES A LONG WAY</span><p>Use a text-based PDF with numbered questions and explicit marks. Scanned papers need text extraction first.</p><a href="/samples/question-paper.pdf" download>Download the sample PDF <ArrowDownToLine size={14} /></a></div>
        </aside>
        <div className="report-column" ref={resultRef} aria-busy={!!busy}>
          <div className="report-top"><div><span className="eyebrow">AUDIT REPORT</span><h2>{report.filename}</h2></div><button className="button secondary" onClick={() => downloadReport(report)}><ArrowDownToLine size={16} /> Download audit</button></div>
          {demo && <div className="demo-note"><FlaskConical size={16} /><span>You’re viewing a sample audit. Upload a paper to review your own.</span><span className="mini-tag">DEMO</span></div>}
          {dirty && <div className="pending-note" role="status">Your inputs have changed. Run the audit to update this report.</div>}
          <section className={`status-banner ${report.issues.length ? '' : 'status-pass'}`}><span className="status-icon">{report.issues.length ? <CircleAlert size={26} /> : <CheckCheck size={26} />}</span><div><div className="status-label">OVERALL STATUS</div><h2>{report.status}</h2><p>{report.issues.length ? `${errors} ${errors === 1 ? 'error' : 'errors'} and ${report.issues.length - errors} suggestions to review before this paper is ready.` : 'No issues found by the enabled checks. Complete an examiner review before use.'}</p></div><span className="status-pill">{report.mode === 'ai' ? 'AI + rules' : 'Rule-based audit'}</span></section>
          <div className="metrics"><Metric label="Total marks" value={`${report.totalMarks}`} suffix={`/ ${report.expectedMarks}`} detail={report.marksComplete ? report.totalMarks === report.expectedMarks ? 'Matches expected total' : 'Total needs attention' : 'Partial total · missing marks'} good={report.marksComplete && report.totalMarks === report.expectedMarks} /><Metric label="Questions parsed" value={`${report.questions.length}`} detail="Ready for question-level review" /><Metric label="Unit coverage" value={report.mapping.units.length ? `${covered}` : '—'} suffix={report.mapping.units.length ? `/ ${report.mapping.units.length}` : ''} detail={report.mapping.units.length ? 'Based on supplied syllabus' : 'Add syllabus to verify'} good={report.mapping.units.length > 0 && covered === report.mapping.units.length} /><Metric label="Issues found" value={`${report.issues.length}`} detail={report.issues.length ? 'See actionable findings below' : 'All enabled checks passed'} warning={!!report.issues.length} /></div>
          <Tabs value={tab} onValueChange={setTab} className="report-tabs"><TabsList variant="line" className="report-tab-list"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="questions">Question breakdown <span className="tab-count">{report.questions.length}</span></TabsTrigger><TabsTrigger value="method">Audit notes</TabsTrigger></TabsList>
            <TabsContent value="overview"><div className="chart-grid"><section className="panel chart-panel"><div className="chart-heading"><h3>Bloom’s taxonomy</h3><span>By question count</span></div><p className="chart-subtitle">The cognitive balance of your assessment.</p><div className="bloom-chart">{dist.filter(d => d.label !== 'Unclassified' || d.count).map((d, i) => <div className="bloom-row" key={d.label}><span>{d.label}</span><div className="bar-track"><div style={{ width: `${d.percent}%`, background: COLORS[i] }} /></div><strong>{Math.round(d.percent)}<small>%</small></strong></div>)}</div><div className="chart-footer"><span className="legend-dot" style={{ background: '#dfb166' }} /> Apply target: at least {report.minApply}%</div></section>
              <section className="panel chart-panel"><div className="chart-heading"><h3>Course outcomes</h3><span>CO coverage</span></div><p className="chart-subtitle">How questions map to learning outcomes.</p><COChart report={report} /><div className="chart-footer"><Layers3 size={14} /> {report.mapping.cos.length ? 'Compared with your outcome mapping' : 'Add a CO mapping to verify coverage'}</div></section></div>
              <section className="panel issues-panel"><div className="issues-heading"><h3>Findings to review <span className="tab-count">{report.issues.length}</span></h3><span>Ordered by severity</span></div>{report.issues.length ? [...report.issues].sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1)).map(issue => <details className="issue" key={issue.id}><summary><span className={`issue-symbol ${issue.severity}`}>{issue.severity === 'error' ? <X size={15} /> : <CircleAlert size={15} />}</span><div><strong>{issue.title}</strong><p>{issue.detail}</p></div><span className={`severity-label ${issue.severity}`}>{issue.severity === 'error' ? 'Error' : 'Review'}</span><span className="issue-arrow">⌄</span></summary><div className="issue-detail"><strong>Recommended action</strong><p>{issue.action}</p>{issue.questions.map(id => { const q = report.questions.find(q => q.id === id); return q && <blockquote key={id}><b>Q{q.number}</b> {q.text}</blockquote>; })}</div></details>) : <div className="no-issues"><CheckCheck size={23} /><p>No issues found. Review the question breakdown to confirm the classifications.</p></div>}</section>
            </TabsContent>
            <TabsContent value="questions"><section className="panel question-panel"><h3>A closer look at every question</h3><p className="chart-subtitle">Review extracted marks and suggested classifications. Correct the input text and re-run if needed.</p><Table><TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Marks</TableHead><TableHead>Unit / CO</TableHead><TableHead>Bloom level</TableHead></TableRow></TableHeader><TableBody>{report.questions.map(q => <TableRow key={q.id}><TableCell className="question-text"><strong>Q{q.number}</strong><p>{q.text}</p><small>{q.basis}</small></TableCell><TableCell>{q.marks ?? 'Unread'}</TableCell><TableCell>{q.unit ?? 'Unmapped'}<br /><small>{q.co ?? 'Unmapped'}</small></TableCell><TableCell><span className="bloom-tag">{q.bloom}</span></TableCell></TableRow>)}</TableBody></Table></section></TabsContent>
            <TabsContent value="method"><section className="panel method-panel"><h3>What this audit checks</h3><p>The report combines structural checks with suggested learning classifications. It supports an examiner’s decision; it does not certify a paper.</p><ul>{report.notes.map(note => <li key={note}>{note}</li>)}<li>Rule mode uses command verbs, syllabus keywords and limited wording normalization. It cannot reliably detect all semantic duplicates.</li><li>AI mode, when configured and selected, suggests Bloom levels, syllabus mappings and semantic duplicate pairs. Each suggestion still needs review.</li><li>Scanned PDFs, diagrams, two-column layouts, section resets and optional questions may need manual text correction.</li><li>Coverage percentages describe the paper. They are not a claim of compliance with university policy.</li></ul><p className="method-stamp">Engine: {report.mode === 'ai' ? 'AI + deterministic rules' : 'Deterministic rules'} · {report.questions.length} questions · No paper history stored</p></section></TabsContent>
          </Tabs><footer className="report-footer"><ShieldCheck size={14} /> A clearer paper starts with a careful review.<span>Paperlens / MVP 01</span></footer>
        </div>
      </div>
    </main>
  </div>;
}
function Metric({ label, value, suffix, detail, good, warning }: { label: string; value: string; suffix?: string; detail: string; good?: boolean; warning?: boolean }) { return <section className="panel metric"><div className="metric-label">{label}{good && <Check size={16} />}{warning && <CircleAlert size={16} />}</div><div className={`metric-value ${warning ? 'amber' : ''}`}>{value}<span>{suffix}</span></div><p>{detail}</p></section>; }
function COChart({ report }: { report: AuditReport }) {
  const labels = [...new Set([...report.mapping.cos.map(c => c.label), ...report.questions.map(q => q.co || 'Unmapped')])];
  const values = labels.map(label => ({ label, count: report.questions.filter(q => (q.co || 'Unmapped') === label).length }));
  return <div className="co-chart"><div className="co-stack" aria-label="Course outcome distribution">{values.filter(v => v.count).map((v, i) => <div key={v.label} style={{ flex: v.count, background: COLORS[(i + 1) % COLORS.length] }} title={`${v.label}: ${v.count} questions`} />)}</div><div className="co-legend">{values.map((v, i) => <div key={v.label}><span className="legend-dot" style={{ background: COLORS[(i + 1) % COLORS.length] }} /><span>{v.label}</span><small>{v.count} questions</small><strong>{Math.round(v.count / report.questions.length * 100)}%</strong></div>)}</div></div>;
}
