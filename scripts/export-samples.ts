import { mkdirSync, writeFileSync } from 'node:fs';
import { SAMPLE_PAPER, SAMPLE_SYLLABUS } from '../lib/audit/sample';
mkdirSync('public/samples', { recursive: true });
writeFileSync('public/samples/question-paper.txt', SAMPLE_PAPER);
writeFileSync('public/samples/syllabus.txt', SAMPLE_SYLLABUS);
