export const BLOOMS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create', 'Unclassified'] as const;
export type Bloom = typeof BLOOMS[number];
export type Question = { id: string; number: number; text: string; marks: number | null; unit: string | null; co: string | null; bloom: Bloom; basis: string };
export type Issue = { id: string; severity: 'error' | 'warning'; title: string; detail: string; action: string; questions: string[] };
export type Mapping = { units: { label: string; keywords: string[] }[]; cos: { label: string; keywords: string[] }[] };
export type AuditInput = { text: string; syllabus: string; expectedMarks: number; expectedQuestions: number | null; minApply: number; filename: string; useAI?: boolean };
export type AuditReport = { filename: string; createdAt: string; mode: 'rules' | 'ai'; questions: Question[]; issues: Issue[]; mapping: Mapping; totalMarks: number; expectedMarks: number; marksComplete: boolean; minApply: number; status: 'Needs review' | 'Checks passed'; notes: string[] };
