"""Optional developer utility: regenerate the demonstration PDF (pip install reportlab)."""
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from xml.sax.saxutils import escape

root = Path(__file__).resolve().parents[1]
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('PaperTitle', fontName='Helvetica-Bold', fontSize=16, leading=22, alignment=TA_CENTER, textColor=HexColor('#195e47')))
styles.add(ParagraphStyle('PaperMeta', fontName='Helvetica', fontSize=10, leading=15, alignment=TA_CENTER, textColor=HexColor('#607568')))
styles.add(ParagraphStyle('Question', fontName='Helvetica', fontSize=10, leading=15, spaceAfter=12))
lines = (root / 'public/samples/question-paper.txt').read_text(encoding='utf-8').splitlines()
story = []
for i, line in enumerate(lines):
    if not line.strip():
        story.append(Spacer(1, 15))
        continue
    style = styles['PaperTitle' if i < 2 else 'PaperMeta' if i < 4 else 'Question']
    story.append(Paragraph(escape(line), style))
def footer(canvas, document):
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(HexColor('#7e8d83'))
    canvas.drawString(45, 26, 'PAPERLENS DEMO | Deliberate errors included for audit demonstration')
    canvas.drawRightString(550, 26, 'Page ' + str(document.page))
SimpleDocTemplate(str(root / 'public/samples/question-paper.pdf'), rightMargin=45, leftMargin=45, topMargin=35, bottomMargin=45).build(story, onFirstPage=footer, onLaterPages=footer)
