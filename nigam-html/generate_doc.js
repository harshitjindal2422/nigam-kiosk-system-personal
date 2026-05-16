
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, convertInchesToTwip,
  Header, Footer, PageNumber, UnderlineType,
} = require("docx");
const fs = require("fs");

// ─── Constants ───────────────────────────────────────────────────────────────
const FONT  = "Times New Roman";
const BLACK = "000000";
const GRAY  = "444444";
const WHITE = "FFFFFF";
const BODY_SIZE  = 24;   // 12pt
const SMALL_SIZE = 20;   // 10pt
const H1_SIZE    = 28;   // 14pt
const H2_SIZE    = 24;   // 12pt

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sp(before = 0, after = 0) { return { before, after }; }

function blank(pt = 6) {
  return new Paragraph({ children: [new TextRun({ text: "", size: pt * 2 })] });
}

function centeredLine(text, { bold = false, size = BODY_SIZE, underline = false, italic = false } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: sp(0, 60),
    children: [new TextRun({
      text, bold, size, font: FONT, italics: italic,
      underline: underline ? { type: UnderlineType.SINGLE } : undefined,
    })],
  });
}

function body(text, { bold = false, align = AlignmentType.JUSTIFIED, indent = 0, spacing = 140 } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after: spacing, line: 360 },   // 1.5 line spacing
    indent: indent ? { left: convertInchesToTwip(indent) } : undefined,
    children: [new TextRun({ text, size: BODY_SIZE, font: FONT, bold })],
  });
}

function numbered(n, text) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: `${n}.  `, size: BODY_SIZE, font: FONT, bold: true }),
      new TextRun({ text, size: BODY_SIZE, font: FONT }),
    ],
  });
}

function bullet(text, level = 0) {
  const leftIn = 0.4 + level * 0.3;
  return new Paragraph({
    spacing: { after: 100, line: 340 },
    indent: { left: convertInchesToTwip(leftIn), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: level === 0 ? "•  " : "–  ", size: BODY_SIZE, font: FONT }),
      new TextRun({ text, size: BODY_SIZE, font: FONT }),
    ],
  });
}

function subBullet(label, value) {
  return new Paragraph({
    spacing: { after: 80, line: 340 },
    indent: { left: convertInchesToTwip(0.7) },
    children: [
      new TextRun({ text: `${label}: `, size: BODY_SIZE, font: FONT, bold: true }),
      new TextRun({ text: value, size: BODY_SIZE, font: FONT }),
    ],
  });
}

function sectionHeading(n, title) {
  return new Paragraph({
    spacing: sp(280, 120),
    children: [new TextRun({
      text: `${n}.  ${title.toUpperCase()}`,
      size: H1_SIZE, font: FONT, bold: true,
      underline: { type: UnderlineType.SINGLE },
    })],
  });
}

function subHeading(title) {
  return new Paragraph({
    spacing: sp(200, 80),
    children: [new TextRun({ text: title, size: H2_SIZE, font: FONT, bold: true })],
  });
}

function flowItem(step, text) {
  return new Paragraph({
    spacing: { after: 80, line: 320 },
    indent: { left: convertInchesToTwip(0.5) },
    children: [
      new TextRun({ text: `${step}:  `, size: BODY_SIZE, font: FONT, bold: true }),
      new TextRun({ text, size: BODY_SIZE, font: FONT }),
    ],
  });
}

function arrowLine() {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.6) },
    children: [new TextRun({ text: "↓", size: BODY_SIZE, font: "Arial" })],
  });
}

function hrule() {
  return new Paragraph({
    spacing: sp(60, 60),
    border: { bottom: { color: BLACK, size: 4, style: BorderStyle.SINGLE } },
    children: [],
  });
}

function noteBox(label, text) {
  return new Paragraph({
    spacing: sp(120, 120),
    indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
    border: {
      top:    { color: BLACK, size: 4, style: BorderStyle.SINGLE },
      bottom: { color: BLACK, size: 4, style: BorderStyle.SINGLE },
      left:   { color: BLACK, size: 4, style: BorderStyle.SINGLE },
      right:  { color: BLACK, size: 4, style: BorderStyle.SINGLE },
    },
    children: [
      new TextRun({ text: `${label}: `, size: BODY_SIZE, font: FONT, bold: true }),
      new TextRun({ text, size: BODY_SIZE, font: FONT, italics: true }),
    ],
  });
}

// ─── Table Builder ────────────────────────────────────────────────────────────
function buildTable(headers, rows) {
  const bdr = { color: BLACK, size: 4, style: BorderStyle.SINGLE };
  const borders = { top: bdr, bottom: bdr, left: bdr, right: bdr };

  const hdrCells = headers.map(h =>
    new TableCell({
      borders,
      shading: { type: ShadingType.SOLID, color: "D0D0D0" },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: h, size: BODY_SIZE, font: FONT, bold: true })],
      })],
    })
  );

  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          borders,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: SMALL_SIZE + 2, font: FONT })],
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: hdrCells }),
      ...dataRows,
    ],
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1.0),
            bottom: convertInchesToTwip(1.0),
            left:   convertInchesToTwip(1.0),
            right:  convertInchesToTwip(1.0),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { bottom: { color: BLACK, size: 4, style: BorderStyle.SINGLE } },
              spacing: sp(0, 80),
              children: [new TextRun({
                text: "NAGAR NIGAM KIOSK SYSTEM — INTERNAL TECHNICAL NOTE",
                size: SMALL_SIZE, font: FONT, bold: true,
              })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { color: BLACK, size: 4, style: BorderStyle.SINGLE } },
              spacing: sp(60, 0),
              children: [
                new TextRun({ text: "Page ", size: SMALL_SIZE, font: FONT }),
                new TextRun({ children: [PageNumber.CURRENT], size: SMALL_SIZE, font: FONT }),
                new TextRun({ text: " of ", size: SMALL_SIZE, font: FONT }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: SMALL_SIZE, font: FONT }),
                new TextRun({ text: "   |   For Official Use Only", size: SMALL_SIZE, font: FONT }),
              ],
            }),
          ],
        }),
      },
      children: [

        // ═══════════════════════════════════════════════════════════════
        //  MEMO HEADER
        // ═══════════════════════════════════════════════════════════════
        blank(4),
        centeredLine("NAGAR NIGAM", { bold: true, size: 32, underline: true }),
        centeredLine("Kiosk Self-Service System", { bold: true, size: 26 }),
        blank(4),
        hrule(),
        blank(4),

        centeredLine("INTERNAL TECHNICAL NOTE", { bold: true, size: 28, underline: true }),
        blank(4),
        centeredLine(
          "Subject: Proposed Solutions for Phechan Portal Integration — Fee Collection &",
          { bold: true, size: BODY_SIZE }
        ),
        centeredLine(
          "User Return Flow for Block-1 and Block-2 Services",
          { bold: true, size: BODY_SIZE }
        ),
        blank(4),
        hrule(),
        blank(6),

        // Reference details
        new Paragraph({
          spacing: sp(0, 80),
          children: [
            new TextRun({ text: "Reference No.:  ", size: BODY_SIZE, font: FONT, bold: true }),
            new TextRun({ text: "NN/KIOSK/2026/___", size: BODY_SIZE, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: sp(0, 80),
          children: [
            new TextRun({ text: "Date:  ", size: BODY_SIZE, font: FONT, bold: true }),
            new TextRun({ text: today, size: BODY_SIZE, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: sp(0, 80),
          children: [
            new TextRun({ text: "Prepared By:  ", size: BODY_SIZE, font: FONT, bold: true }),
            new TextRun({ text: "Kiosk Development Team, WePitch.", size: BODY_SIZE, font: FONT }),
          ],
        }),
        blank(6),
        hrule(),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 1 — BACKGROUND
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("1", "Background"),
        body(
          "The Nagar Nigam Kiosk System has been developed to provide citizens with a self-service interface " +
          "for availing various municipal services. The system is organized into three functional blocks:"
        ),
        subBullet("Block-1", "Document Printing Services — Citizens download and print official documents from the Phechan Portal."),
        subBullet("Block-2", "Correction Services — Citizens submit correction requests for their records through the Phechan Portal."),
        subBullet("Block-3", "Office Automation (Internal) — Fully managed by Nagar Nigam; no external portal dependency."),
        blank(4),
        body(
          "Since the required API integration permission for the Phechan Portal has not been granted by the competent " +
          "authority, Block-1 and Block-2 cannot be integrated natively into the kiosk system. As an interim measure, " +
          "it has been proposed that citizens be redirected to the Phechan Portal's public web interface directly from " +
          "the kiosk screen."
        ),
        blank(4),
        noteBox("Important",
          "Block-3 services remain fully operational and under Nagar Nigam's control. " +
          "This note exclusively addresses Block-1 and Block-2 services."
        ),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 2 — CHALLENGES
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("2", "Identified Challenges"),
        body(
          "The redirect-based approach to the Phechan Portal gives rise to the following two operational challenges:"
        ),
        blank(4),

        subHeading("2.1  Challenge 1 — Fee Collection"),
        body(
          "Citizens availing Block-1 and Block-2 services are liable to pay the applicable service fee. " +
          "Since the kiosk does not retain control over the external Phechan Portal, there is a risk that citizens " +
          "may complete their task on the portal and leave the kiosk without paying the due fee. " +
          "Fee collection must therefore be enforced before the citizen is redirected."
        ),
        blank(4),
        buildTable(
          ["Service Block", "Fee Type", "Risk if Not Collected Upfront"],
          [
            ["Block-1", "Printing charges (per page)", "Citizen downloads document and exits without paying"],
            ["Block-2", "Platform usage / service charge", "Citizen completes correction and exits without paying"],
            ["Block-3", "Not applicable", "No risk — full system control by Nagar Nigam"],
          ]
        ),
        blank(8),

        subHeading("2.2  Challenge 2 — User Return Flow"),
        body(
          "Once redirected to the Phechan Portal, the citizen's session moves outside the kiosk system. " +
          "There is no automated mechanism to detect when the citizen has completed their work on the external portal " +
          "and requires kiosk services again (printing document / printing correction receipt). " +
          "A reliable method must be established to resume the kiosk session after portal activity."
        ),
        blank(4),
        buildTable(
          ["Block", "Post-Portal Action Required", "Challenge"],
          [
            ["Block-1", "Return to kiosk to print downloaded document", "Kiosk has no notification of portal task completion"],
            ["Block-2", "Return to kiosk to print correction receipt", "No callback available due to missing API access"],
          ]
        ),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 3 — FEE COLLECTION SOLUTIONS
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("3", "Proposed Solution — Fee Collection"),

        subHeading("3.1  Recommended Approach: Pre-Payment Token Gate"),
        body(
          "It is proposed that fee collection be mandatorily completed before the citizen is redirected " +
          "to the Phechan Portal. Upon successful payment, the system will generate a time-bound Session Token " +
          "and print a token slip for the citizen. The token acts as proof of payment and gates access to " +
          "the subsequent print/receipt action."
        ),
        blank(4),
        subHeading("Proposed Step-by-Step Flow:"),
        flowItem("Step 1", "Citizen selects Block-1 (Printing) or Block-2 (Correction) service at the kiosk."),
        arrowLine(),
        flowItem("Step 2", "Kiosk displays a Fee Breakdown Screen showing the applicable charges and payment options."),
        arrowLine(),
        flowItem("Step 3", "Citizen pays the fee independently via UPI QR Code or Cash — displayed directly on the kiosk screen. No operator involvement required."),
        arrowLine(),
        flowItem("Step 4", "Upon successful payment, the system automatically generates a time-bound Session Token (suggested validity: 30–60 minutes)."),
        arrowLine(),
        flowItem("Step 5", "Token slip is printed by the kiosk for the citizen as proof of payment."),
        arrowLine(),
        flowItem("Step 6", "Kiosk redirects the citizen to the Phechan Portal to complete their task."),
        blank(4),
        noteBox("Note",
          "The token ensures that even if the citizen abandons the portal session, the fee already collected " +
          "is secured. The entire payment process is citizen-driven and requires no operator intervention."
        ),
        blank(4),
        buildTable(
          ["Parameter", "Block-1 (Printing)", "Block-2 (Correction)"],
          [
            ["Fee Type", "Per-page printing charge", "Platform usage / service charge"],
            ["Collection Method", "Self-service via UPI QR / Cash on kiosk screen", "Self-service via UPI QR / Cash on kiosk screen"],
            ["Collection Point", "Before redirect to Phechan Portal", "Before redirect to Phechan Portal"],
            ["Proof Issued", "Printed token slip (auto-printed by kiosk)", "Printed token slip (auto-printed by kiosk)"],
            ["Token Validity", "30–60 minutes (to be decided)", "30–60 minutes (to be decided)"],
          ]
        ),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 4 — USER RETURN FLOW SOLUTIONS
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("4", "Proposed Solutions — User Return Flow"),
        body(
          "Three options are proposed for managing the citizen's return to the kiosk after using the Phechan Portal. " +
          "All options operate without any API dependency on the Phechan Portal. They are listed in order of preference:"
        ),
        blank(4),

        subHeading("Option A — 'I Am Done' Button with Waiting Screen (Recommended)"),
        body(
          "While the citizen works on the Phechan Portal, the kiosk transitions to a Waiting Screen that displays " +
          "the session token, a countdown timer, and a clearly marked button labelled 'I Have Completed My Work on " +
          "the Phechan Portal'. When the citizen physically returns to the kiosk and presses this button, " +
          "the system unlocks the relevant print screen."
        ),
        blank(4),
        flowItem("Step 1", "Phechan Portal opens in full-screen browser on the kiosk."),
        arrowLine(),
        flowItem("Step 2", "Citizen performs task (downloads document / submits correction)."),
        arrowLine(),
        flowItem("Step 3", "Citizen returns to kiosk. Kiosk Waiting Screen is visible with session token and timer."),
        arrowLine(),
        flowItem("Step 4", "Citizen (or operator) presses 'I Have Completed My Work on Phechan Portal'."),
        arrowLine(),
        flowItem("Step 4a", "[Block-1] → 'Print Document' screen is unlocked."),
        flowItem("Step 4b", "[Block-2] → 'Print Correction Enrollment Receipt' screen is unlocked."),
        blank(4),
        noteBox("Advantage",
          "No dependency on the Phechan Portal. Session auto-resets after timer expiry, " +
          "preventing the kiosk from being locked indefinitely."
        ),
        blank(6),

        subHeading("Option B — Operator-Assisted Return (Fallback)"),
        body(
          "In this approach, the citizen informs the kiosk operator upon completing their task on the Phechan Portal. " +
          "The operator then manually enters the citizen's token number into the kiosk operator dashboard, " +
          "which unlocks the print or receipt screen."
        ),
        blank(4),
        flowItem("Step 1", "Citizen completes task on Phechan Portal."),
        arrowLine(),
        flowItem("Step 2", "Citizen approaches the kiosk operator and states completion."),
        arrowLine(),
        flowItem("Step 3", "Operator enters the citizen's token number on the dashboard."),
        arrowLine(),
        flowItem("Step 4", "Kiosk unlocks the Print / Print Receipt screen for that token."),
        blank(4),
        noteBox("Advantage",
          "Requires no additional software development. The operator serves as the human bridge " +
          "between the Phechan Portal session and the kiosk."
        ),
        blank(6),

        subHeading("Option C — Timed Auto-Return (Supplementary)"),
        body(
          "A background countdown timer is started when the citizen is redirected to the Phechan Portal. " +
          "Upon timer expiry, or when the citizen manually presses the 'Done' button, the kiosk automatically " +
          "transitions to the appropriate next screen."
        ),
        blank(4),
        flowItem("Step 1", "Kiosk redirects citizen to Phechan Portal and starts a countdown timer (e.g., 10 minutes)."),
        arrowLine(),
        flowItem("Step 2a", "Timer expires → Kiosk transitions to 'Ready to Print' or 'Print Receipt' screen."),
        flowItem("Step 2b", "OR — Citizen presses 'I Am Done' button → Kiosk transitions immediately."),
        blank(4),
        noteBox("Limitation",
          "This option relies on an estimated time and may not suit all citizens. " +
          "Recommended only as a supplementary mechanism alongside Option A or Option B."
        ),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 5 — COMPARISON
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("5", "Comparison of Proposed Options"),
        buildTable(
          ["Issue", "Recommended Option", "Fallback Option"],
          [
            ["Fee Collection (Block-1 & 2)", "Pre-payment before redirect + Token slip", "Operator manual confirmation of payment"],
            ["User Return — Block-1", "Option A: 'Done' button + Token-gated Print screen", "Option B: Operator enters token on dashboard"],
            ["User Return — Block-2", "Option A: 'Done' button + Print Correction Receipt", "Option B: Operator enters token on dashboard"],
            ["Session Timeout", "30-minute auto-reset of kiosk session", "Manual session clear by operator"],
          ]
        ),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 6 — COMBINED FLOW
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("6", "Recommended End-to-End Flow"),
        body(
          "The following unified flow combines pre-payment (Section 3) with Option A — 'I Am Done' button " +
          "with Waiting Screen (Section 4) for the most efficient and citizen-friendly experience:"
        ),
        blank(4),
        flowItem("Step 1", "Citizen selects Block-1 or Block-2 service at the kiosk."),
        arrowLine(),
        flowItem("Step 2", "Fee Breakdown Screen displayed. Citizen pays independently via UPI QR Code or Cash shown on kiosk screen. Token auto-generated on payment."),
        arrowLine(),
        flowItem("Step 3", "Session Token generated. Token slip printed and handed to citizen."),
        arrowLine(),
        flowItem("Step 4", "Kiosk opens Phechan Portal in full-screen browser. Citizen performs task."),
        arrowLine(),
        flowItem("Step 5", "Kiosk Waiting Screen active: session token visible, timer running, 'Done' button displayed."),
        arrowLine(),
        flowItem("Step 6", "Citizen returns and presses 'I Have Completed My Work on the Phechan Portal'."),
        arrowLine(),
        flowItem("Step 7a", "[Block-1] → Print Document screen unlocked. Citizen prints downloaded document."),
        flowItem("Step 7b", "[Block-2] → Print Correction Enrollment Receipt screen unlocked. Receipt printed."),
        arrowLine(),
        flowItem("Step 8", "Session ends. Kiosk resets to the home/start screen."),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 7 — PENDING DECISIONS
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("7", "Pending Decisions / Items Requiring Authority Approval"),
        body(
          "The following items require review and approval by the competent authority before implementation can commence:"
        ),
        blank(4),
        numbered("1", "Confirmation of applicable fee amounts for Block-1 (per-page printing charge) and Block-2 (platform usage fee)."),
        numbered("2", "Approval of session token validity duration (suggested: 30 minutes)."),
        numbered("3", "Selection of preferred User Return Option: Option A (Recommended) or Option B (Operator-Assisted)."),
        numbered("4", "Clarification on whether printed payment receipts require an official stamp or a plain printed slip is acceptable."),
        numbered("5", "Decision on whether the Phechan Portal should open on the kiosk screen or on a separate citizen device."),
        numbered("6", "Grant of Phechan Portal API access, if available in future, to enable full native integration."),
        blank(8),

        // ═══════════════════════════════════════════════════════════════
        //  SECTION 8 — DISCLAIMER
        // ═══════════════════════════════════════════════════════════════
        sectionHeading("8", "Disclaimer"),
        body(
          "This document is prepared for internal discussion and planning purposes only. All flows and solutions " +
          "described herein are in a proposed state and have not been implemented. No technical changes have been " +
          "made to the live kiosk system. Implementation shall commence only upon receipt of written approval " +
          "from the competent authority."
        ),
        blank(8),

        // ─── SIGNATURE BLOCK ─────────────────────────────────────────
        hrule(),
        blank(6),
        new Paragraph({
          spacing: sp(0, 80),
          children: [new TextRun({ text: "Prepared by:", size: BODY_SIZE, font: FONT, bold: true })],
        }),
        blank(20),
        new Paragraph({
          spacing: sp(0, 60),
          children: [new TextRun({ text: "__________________________", size: BODY_SIZE, font: FONT })],
        }),
        new Paragraph({
          spacing: sp(0, 60),
          children: [new TextRun({ text: "Kiosk Development Team", size: BODY_SIZE, font: FONT })],
        }),
        new Paragraph({
          spacing: sp(0, 60),
          children: [new TextRun({ text: "WePitch.", size: BODY_SIZE, font: FONT })],
        }),
        blank(16),
        new Paragraph({
          spacing: sp(0, 80),
          children: [new TextRun({ text: "Reviewed / Approved by:", size: BODY_SIZE, font: FONT, bold: true })],
        }),
        blank(20),
        new Paragraph({
          spacing: sp(0, 60),
          children: [new TextRun({ text: "__________________________", size: BODY_SIZE, font: FONT })],
        }),
        new Paragraph({
          spacing: sp(0, 60),
          children: [new TextRun({ text: "Designation: ___________________________", size: BODY_SIZE, font: FONT })],
        }),
        new Paragraph({
          spacing: sp(0, 60),
          children: [new TextRun({ text: `Date: ${today}`, size: BODY_SIZE, font: FONT })],
        }),
        blank(8),
        hrule(),
        blank(6),
        centeredLine("— End of Document —", { italic: true, size: SMALL_SIZE }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outFile = "Phechan_Portal_Proposed_Solutions_v2.docx";
  fs.writeFileSync(outFile, buffer);
  console.log(`✅  Document saved: ${outFile}`);
}

main().catch(err => { console.error(err); process.exit(1); });
