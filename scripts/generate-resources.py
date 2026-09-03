from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "resources"
OUTPUT.mkdir(parents=True, exist_ok=True)

INK = HexColor("#080808")
PANEL = HexColor("#141414")
CREAM = HexColor("#F4EFE5")
GOLD = HexColor("#C9A45C")
MUTED = HexColor("#6F6A62")
LINE = HexColor("#D7CEBE")
WHITE = HexColor("#FFFFFF")

pdfmetrics.registerFont(TTFont("BYNVSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("BYNVSansBold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("BYNVSerif", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"))

styles = getSampleStyleSheet()
TITLE = ParagraphStyle("Title", parent=styles["Title"], fontName="BYNVSerif", fontSize=34, leading=37, textColor=INK, spaceAfter=16)
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="BYNVSerif", fontSize=24, leading=27, textColor=INK, spaceBefore=8, spaceAfter=12)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="BYNVSansBold", fontSize=10, leading=14, textColor=GOLD, spaceBefore=12, spaceAfter=6, tracking=1.2)
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontName="BYNVSans", fontSize=10, leading=15, textColor=HexColor("#302E2A"), spaceAfter=9)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8, leading=11, textColor=MUTED)
PROMPT = ParagraphStyle("Prompt", parent=BODY, fontName="BYNVSansBold", fontSize=10, leading=14, textColor=INK, spaceAfter=7)


def cover(canvas, doc, title, subtitle):
    width, height = letter
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1)
    canvas.rect(0.55 * inch, 0.55 * inch, width - 1.1 * inch, height - 1.1 * inch, fill=0, stroke=1)
    canvas.setFillColor(GOLD)
    canvas.setFont("BYNVSansBold", 10)
    canvas.drawString(0.82 * inch, height - 1.12 * inch, "BECOME YOUR NEXT VERSION")
    canvas.setFont("BYNVSerif", 66)
    canvas.drawRightString(width - 0.82 * inch, height - 1.24 * inch, "A")
    text = canvas.beginText(0.82 * inch, height - 2.45 * inch)
    text.setFont("BYNVSerif", 32)
    text.setLeading(37)
    text.setFillColor(CREAM)
    for line in title.split("\n"):
        text.textLine(line)
    canvas.drawText(text)
    canvas.setFillColor(GOLD)
    canvas.rect(0.82 * inch, height - 4.35 * inch, 1.25 * inch, 0.04 * inch, fill=1, stroke=0)
    canvas.setFillColor(CREAM)
    canvas.setFont("BYNVSans", 12)
    sub = canvas.beginText(0.82 * inch, height - 4.78 * inch)
    sub.setLeading(17)
    for line in subtitle.split("\n"):
        sub.textLine(line)
    canvas.drawText(sub)
    canvas.setFillColor(MUTED)
    canvas.setFont("BYNVSans", 8)
    canvas.drawString(0.82 * inch, 0.86 * inch, "THE ARCHITECTS  /  FREE BYNV RESOURCE")
    canvas.drawRightString(width - 0.82 * inch, 0.86 * inch, "BECOMEYOURNEXTVERSION.COM")
    canvas.restoreState()


def body_page(canvas, doc):
    width, height = letter
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.8)
    canvas.line(0.72 * inch, height - 0.58 * inch, width - 0.72 * inch, height - 0.58 * inch)
    canvas.setFillColor(INK)
    canvas.setFont("BYNVSansBold", 8)
    canvas.drawString(0.72 * inch, height - 0.42 * inch, "BYNV  /  THE ARCHITECTS")
    canvas.setFillColor(MUTED)
    canvas.setFont("BYNVSans", 7)
    canvas.drawString(0.72 * inch, 0.42 * inch, "FOR REFLECTION AND EDUCATION - NOT PROFESSIONAL ADVICE")
    canvas.drawRightString(width - 0.72 * inch, 0.42 * inch, f"{doc.page}")
    canvas.restoreState()


def write_lines(rows=4):
    table = Table([[""] for _ in range(rows)], colWidths=[6.45 * inch], rowHeights=[0.34 * inch] * rows)
    table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
    ]))
    return table


def prompt_block(title, copy=None, rows=3):
    items = [Paragraph(title, PROMPT)]
    if copy:
        items.append(Paragraph(copy, SMALL))
    items.extend([Spacer(1, 4), write_lines(rows), Spacer(1, 12)])
    return KeepTogether(items)


def make_pdf(filename, cover_title, cover_subtitle, story):
    target = OUTPUT / filename
    doc = BaseDocTemplate(str(target), pagesize=letter, leftMargin=0.72 * inch, rightMargin=0.72 * inch, topMargin=0.82 * inch, bottomMargin=0.72 * inch, title=cover_title.replace("\n", " "), author="Become Your Next Version")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame], onPage=lambda c, d: cover(c, d, cover_title, cover_subtitle), autoNextPageTemplate="body"),
        PageTemplate(id="body", frames=[frame], onPage=body_page),
    ])
    doc.build([Spacer(1, 9 * inch), PageBreak(), *story])
    return target


quiet_audit = [
    Paragraph("The Quiet Audit", TITLE),
    Paragraph("A ten-minute practice for separating what matters from what is merely loud.", BODY),
    Paragraph("HOW TO USE THIS", H2),
    Paragraph("Set a ten-minute timer. Answer quickly and honestly. You are collecting a signal, not writing a perfect explanation.", BODY),
    prompt_block("1. What has taken the most attention from me during the past seven days?", rows=4),
    prompt_block("2. Which part of that attention was chosen - and which part was reactive?", rows=4),
    PageBreak(),
    Paragraph("Name the signal", TITLE),
    prompt_block("3. What matters most in this season of my life, even if nobody else notices?", rows=4),
    prompt_block("4. What am I saying yes to that makes that priority harder to protect?", rows=4),
    prompt_block("5. What is one thing I can pause, decline, remove, or postpone this week?", rows=3),
    Paragraph("YOUR NEXT DELIBERATE ACTION", H2),
    Paragraph("Write one action that can be completed in 20 minutes or less and supports what you named above.", BODY),
    write_lines(3),
    Spacer(1, 14),
    Paragraph("Review after seven days: Did this action create more clarity, less friction, or useful evidence? Keep what worked. Adjust what did not.", SMALL),
]

momentum = [
    Paragraph("Minimum Viable Momentum", TITLE),
    Paragraph("A dramatic reset can feel powerful. A smaller action you can repeat is usually more useful.", BODY),
    Paragraph("START WITH ONE PRIORITY", H2),
    prompt_block("What outcome matters most during the next seven days?", rows=3),
    prompt_block("What is the smallest completed action that would count as real progress?", "Make it observable. 'Work on it' is vague; 'draft the first paragraph' is visible.", rows=3),
    prompt_block("When and where will this action happen?", rows=2),
    PageBreak(),
    Paragraph("Build the repeat", TITLE),
    Paragraph("Use the boxes to record evidence. A checked box means the action was completed - not that the day was perfect.", BODY),
    Table(
        [[Paragraph("DAY", H2), Paragraph("THE ACTION", H2), Paragraph("DONE", H2), Paragraph("WHAT HELPED OR GOT IN THE WAY", H2)]] +
        [[str(i), "", "[   ]", ""] for i in range(1, 8)],
        colWidths=[0.45 * inch, 2.15 * inch, 0.65 * inch, 3.2 * inch],
        rowHeights=[0.38 * inch] + [0.55 * inch] * 7,
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PANEL),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), "BYNVSans"),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]),
    ),
    Spacer(1, 18),
    prompt_block("What should I keep, change, or stop next week?", rows=4),
]

operating_system = [
    Paragraph("Your Personal Operating System", TITLE),
    Paragraph("You do not need to control every part of life. You do need to notice the conditions that help you act well more often.", BODY),
    Paragraph("ENERGY", H2),
    prompt_block("Which activities, people, and environments reliably give me useful energy?", rows=3),
    prompt_block("What repeatedly drains energy without creating enough value?", rows=3),
    Paragraph("FOCUS", H2),
    prompt_block("When and where do I do my clearest work?", rows=3),
    PageBreak(),
    Paragraph("Design the conditions", TITLE),
    Paragraph("BOUNDARIES", H2),
    prompt_block("What limit would protect my time, attention, or recovery this month?", rows=3),
    Paragraph("SYSTEMS", H2),
    prompt_block("Which reminder, routine, checklist, or environment change would make the right action easier?", rows=4),
    Paragraph("SUPPORT", H2),
    prompt_block("Who can offer honest support, feedback, or accountability without taking ownership of the work from me?", rows=3),
    PageBreak(),
    Paragraph("Write your operating rules", TITLE),
    Paragraph("Complete each sentence with a practical rule you can test. Keep the rules flexible enough to survive a real week.", BODY),
    prompt_block("I protect my attention by...", rows=2),
    prompt_block("When I feel stuck, I return to...", rows=2),
    prompt_block("Before I add a new commitment, I...", rows=2),
    prompt_block("I review my progress every...", rows=2),
    prompt_block("The first evidence that this system is helping will be...", rows=3),
]


make_pdf("bynv-quiet-audit.pdf", "THE QUIET\nAUDIT", "Notice what matters.\nReduce the noise. Choose one next action.", quiet_audit)
make_pdf("bynv-minimum-viable-momentum.pdf", "MINIMUM VIABLE\nMOMENTUM", "Turn one priority into\nan action small enough to repeat.", momentum)
make_pdf("bynv-personal-operating-system.pdf", "YOUR PERSONAL\nOPERATING SYSTEM", "Design the conditions that help\nyou act deliberately more often.", operating_system)
