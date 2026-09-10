# Two-minute hackathon demo

1. Open Paperlens and click **Try sample paper**. This calls the real audit endpoint.
2. Show **60 / 60 marks**, **12 questions**, **5 / 5 units**, and **3 issues**.
3. Expand the duplicate finding: Q2 and Q11 ask the same BFS question. Show the numbering gap at Q8.
4. Explain that only one question is classified Apply: 1/12 = 8.3%, below the selected 20% threshold.
5. Open **Question breakdown** to show the original question text, marks, Unit, CO and suggested Bloom level.
6. Click **Download audit**. Open the HTML report, then use **Print / Save as PDF** to share it.
7. Upload `public/samples/question-paper.pdf` to show actual PDF extraction. Add `public/samples/syllabus.txt`, review the extracted text, and re-run.

## Honest explanation to judges

“The structural checks are deterministic. Without an API key, Bloom and mapping suggestions use command verbs and keywords. With AI explicitly enabled, the backend adds semantic duplicate suggestions and context-aware classification. The examiner remains responsible for the final paper.”

Do not present the default demo as a live AI result. No paid AI request was made while building this prototype.

## Correct the sample live

Rename Q9–Q13 to Q8–Q12 to close the gap. Replace the second BFS question with `Apply Dijkstra's algorithm to compute shortest paths in a graph. [5 marks] [Unit 4] [CO4]`. Replace Q5 with `Apply stack operations to evaluate a postfix expression. [5 marks] [Unit 2] [CO2]`. Re-run: three Apply questions reach 25%, with no duplicate or numbering gap.
