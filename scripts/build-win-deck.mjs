#!/usr/bin/env node
// Build "Why Customers Choose Duro" win-analysis deck from /api/win-reasons JSON.
//
// Usage:
//   node scripts/build-win-deck.mjs <win-reasons.json> [out.pptx]
//
// Input JSON shape (from GET/POST /api/win-reasons):
//   { accountsAnalyzed, notFound, narrative, themes: [{ reason, count, pct, accounts }] }

import pptxgen from "pptxgenjs";
import { readFileSync } from "fs";

const inPath = process.argv[2];
const outPath = process.argv[3] || "Why-Customers-Choose-Duro.pptx";
if (!inPath) {
  console.error("Usage: node scripts/build-win-deck.mjs <win-reasons.json> [out.pptx]");
  process.exit(1);
}

const data = JSON.parse(readFileSync(inPath, "utf-8"));
const accountsAnalyzed = Number(data.accountsAnalyzed) || 0;
const narrative = String(data.narrative || "").trim();
const themes = (Array.isArray(data.themes) ? data.themes : [])
  .map((t) => ({
    reason: String(t.reason || "").trim(),
    count: Number(t.count) || 0,
    pct: Number(t.pct) || 0,
    accounts: Array.isArray(t.accounts) ? t.accounts.map(String) : [],
  }))
  .filter((t) => t.reason)
  .sort((a, b) => b.count - a.count);

// ---- Palette (Duro) --------------------------------------------------------
const NAVY = "0B1F4D";      // dark background for title / closing
const BLUE = "2563EB";      // Duro blue — primary accent
const BLUE_DK = "1D4ED8";   // deeper blue
const ICE = "DCE7FF";       // light blue tint
const INK = "0F172A";       // near-black text
const SLATE = "475569";     // muted text
const CLOUD = "F1F5F9";     // light card fill
const WHITE = "FFFFFF";

const SERIF = "Cambria";    // header font (safe-list)
const SANS = "Calibri";     // body font (safe-list)

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "Duro Tracks";
pres.title = "Why Customers Choose Duro";
const W = 13.333;
const H = 7.5;

const today = process.env.DECK_DATE || "";

// helper: fresh shadow object each call (pptxgenjs mutates in place)
const softShadow = () => ({ type: "outer", color: "0B1F4D", opacity: 0.18, blur: 8, offset: 3, angle: 90 });

// ---- Slide 1: Title --------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  // subtle motif: large translucent circle
  s.addShape(pres.ShapeType.ellipse, { x: 9.6, y: -2.2, w: 6.5, h: 6.5, fill: { color: BLUE, transparency: 78 }, line: { type: "none" } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.2, y: 4.3, w: 4.2, h: 4.2, fill: { color: BLUE_DK, transparency: 82 }, line: { type: "none" } });

  s.addText("DURO", { x: 0.7, y: 0.6, w: 4, h: 0.5, fontFace: SANS, fontSize: 16, bold: true, color: ICE, charSpacing: 6 });
  s.addText("Why Customers Choose Duro", {
    x: 0.7, y: 2.3, w: 9.6, h: 1.8, fontFace: SERIF, fontSize: 46, bold: true, color: WHITE, lineSpacingMultiple: 1.0,
  });
  s.addText(
    `Purchase-driver analysis across ${accountsAnalyzed} Closed-Won account${accountsAnalyzed === 1 ? "" : "s"}`,
    { x: 0.72, y: 4.15, w: 10, h: 0.6, fontFace: SANS, fontSize: 20, color: ICE }
  );
  if (today) s.addText(today, { x: 0.72, y: 6.5, w: 6, h: 0.4, fontFace: SANS, fontSize: 13, color: "9BB4E8" });
}

// ---- Slide 2: Executive summary -------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addText("Executive summary", { x: 0.7, y: 0.5, w: 9, h: 0.7, fontFace: SERIF, fontSize: 34, bold: true, color: INK });

  if (narrative) {
    s.addText(narrative, {
      x: 0.7, y: 1.5, w: 7.1, h: 4.6, fontFace: SANS, fontSize: 17, color: INK, lineSpacingMultiple: 1.25, valign: "top",
    });
  }

  // Top-3 driver callouts on the right
  const top3 = themes.slice(0, 3);
  const cardX = 8.35, cardW = 4.25, cardH = 1.55, gap = 0.28;
  let cy = 1.5;
  top3.forEach((t, i) => {
    s.addShape(pres.ShapeType.roundRect, { x: cardX, y: cy, w: cardW, h: cardH, rectRadius: 0.1, fill: { color: i === 0 ? BLUE : CLOUD }, line: { type: "none" }, shadow: softShadow() });
    const fg = i === 0 ? WHITE : INK;
    const sub = i === 0 ? ICE : SLATE;
    s.addText(`${t.pct}%`, { x: cardX + 0.25, y: cy + 0.12, w: 1.5, h: 0.75, fontFace: SANS, fontSize: 40, bold: true, color: fg, margin: 0 });
    s.addText(t.reason, { x: cardX + 1.75, y: cy + 0.1, w: cardW - 2.0, h: cardH - 0.2, fontFace: SANS, fontSize: 12, bold: true, color: fg, valign: "middle", margin: 0, fit: "shrink" });
    s.addText(`${t.count} of ${accountsAnalyzed} accounts`, { x: cardX + 0.25, y: cy + 0.92, w: 1.5, h: 0.4, fontFace: SANS, fontSize: 10, color: sub, margin: 0 });
    cy += cardH + gap;
  });
  s.addText("Top purchase drivers", { x: cardX, y: 1.06, w: cardW, h: 0.35, fontFace: SANS, fontSize: 12, bold: true, color: SLATE, charSpacing: 2 });
}

// ---- Slide 3: Ranked chart of all drivers ---------------------------------
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addText("Top purchase drivers", { x: 0.7, y: 0.5, w: 11, h: 0.7, fontFace: SERIF, fontSize: 34, bold: true, color: INK });
  s.addText(`Share of the ${accountsAnalyzed} Closed-Won accounts citing each driver`, { x: 0.72, y: 1.18, w: 11, h: 0.4, fontFace: SANS, fontSize: 14, color: SLATE });

  // Custom horizontal bars — driver names are far too long for a native chart's
  // category axis (PowerPoint falls back to 1..N numbers), so we draw them.
  const rows = themes.slice(0, 8);
  const top = 2.0, bottom = 7.05;
  const rowH = (bottom - top) / rows.length;
  const barH = Math.min(0.34, rowH * 0.5);
  const textX = 0.7, textW = 6.5;
  const barX = 7.35, barMaxW = 4.55; // bar track; % label sits to the right
  rows.forEach((t, i) => {
    const yMid = top + i * rowH + rowH / 2;
    const barY = yMid - barH / 2;
    // driver name (full text, shrink to fit the row)
    s.addText(
      [
        { text: `${i + 1}.  `, options: { bold: true, color: BLUE } },
        { text: t.reason, options: { color: INK } },
      ],
      { x: textX, y: top + i * rowH, w: textW, h: rowH, fontFace: SANS, fontSize: 11, valign: "middle", margin: 0, fit: "shrink", lineSpacingMultiple: 0.95 }
    );
    // track + value bar
    s.addShape(pres.ShapeType.roundRect, { x: barX, y: barY, w: barMaxW, h: barH, rectRadius: 0.05, fill: { color: CLOUD }, line: { type: "none" } });
    const w = Math.max(0.06, (t.pct / 100) * barMaxW);
    s.addShape(pres.ShapeType.roundRect, { x: barX, y: barY, w, h: barH, rectRadius: 0.05, fill: { color: BLUE }, line: { type: "none" } });
    // % label
    s.addText(`${t.pct}%`, { x: barX + barMaxW + 0.12, y: yMid - 0.18, w: 1.0, h: 0.36, fontFace: SANS, fontSize: 13, bold: true, color: INK, valign: "middle", margin: 0 });
  });
}

// ---- Slides 4+: one per top theme -----------------------------------------
themes.slice(0, 5).forEach((t, idx) => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addText(`Driver ${idx + 1}`, { x: 0.7, y: 0.55, w: 5, h: 0.4, fontFace: SANS, fontSize: 13, bold: true, color: BLUE, charSpacing: 3 });
  const titleSize = t.reason.length > 120 ? 24 : t.reason.length > 80 ? 27 : 31;
  s.addText(t.reason, { x: 0.7, y: 0.95, w: 8.1, h: 2.3, fontFace: SERIF, fontSize: titleSize, bold: true, color: INK, valign: "top", lineSpacingMultiple: 1.02, fit: "shrink" });

  // Big stat block on the right
  s.addShape(pres.ShapeType.roundRect, { x: 9.1, y: 0.95, w: 3.5, h: 2.6, rectRadius: 0.12, fill: { color: NAVY }, line: { type: "none" }, shadow: softShadow() });
  s.addText(`${t.pct}%`, { x: 9.1, y: 1.15, w: 3.5, h: 1.4, fontFace: SANS, fontSize: 60, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText(`${t.count} of ${accountsAnalyzed} accounts`, { x: 9.1, y: 2.65, w: 3.5, h: 0.6, fontFace: SANS, fontSize: 15, color: ICE, align: "center", margin: 0 });

  // Example accounts
  const accts = t.accounts.slice(0, 16);
  const dropped = t.accounts.length - accts.length;
  if (accts.length) {
    const label = dropped > 0 ? `Accounts (showing ${accts.length} of ${t.accounts.length})` : "Accounts";
    s.addText(label, { x: 0.7, y: 3.7, w: 8, h: 0.4, fontFace: SANS, fontSize: 14, bold: true, color: SLATE, charSpacing: 2 });
    // chips grid
    const cols = 4, chipW = 2.85, chipH = 0.5, gx = 0.7, gy = 4.2, padX = 0.13, padY = 0.14;
    accts.forEach((name, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const x = gx + c * (chipW + padX), y = gy + r * (chipH + padY);
      s.addShape(pres.ShapeType.roundRect, { x, y, w: chipW, h: chipH, rectRadius: 0.08, fill: { color: CLOUD }, line: { color: ICE, width: 1 } });
      s.addText(name, { x: x + 0.15, y, w: chipW - 0.3, h: chipH, fontFace: SANS, fontSize: 12, color: INK, valign: "middle", margin: 0 });
    });
  }
});

// ---- Methodology -----------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: CLOUD };
  s.addText("Methodology", { x: 0.7, y: 0.5, w: 9, h: 0.7, fontFace: SERIF, fontSize: 34, bold: true, color: INK });
  const bullets = [
    { t: "Source", d: `Sales-call transcripts for ${accountsAnalyzed} Closed-Won Duro accounts, captured in Avoma and analyzed in Duro Tracks.` },
    { t: "Extraction", d: "Per account, an AI pass pulled Company Priorities, Urgency, Decision Criteria, Identified Pain, PLM Value Unlocked, and Competitors considered." },
    { t: "Synthesis", d: "A cross-account pass merged near-duplicate reasons into named themes, counted the accounts each applies to, and ranked them by prevalence." },
    { t: "Reading the numbers", d: "Percentages are the share of the analyzed accounts citing a driver; an account can appear under more than one driver." },
  ];
  let y = 1.6;
  bullets.forEach((b) => {
    s.addShape(pres.ShapeType.ellipse, { x: 0.7, y: y + 0.05, w: 0.22, h: 0.22, fill: { color: BLUE }, line: { type: "none" } });
    s.addText(
      [
        { text: `${b.t}.  `, options: { bold: true, color: INK } },
        { text: b.d, options: { color: SLATE } },
      ],
      { x: 1.1, y, w: 11.4, h: 1.0, fontFace: SANS, fontSize: 16, valign: "top", lineSpacingMultiple: 1.15 }
    );
    y += 1.25;
  });
}

// ---- Appendix: full account list ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addText("Appendix — accounts analyzed", { x: 0.7, y: 0.5, w: 11, h: 0.7, fontFace: SERIF, fontSize: 30, bold: true, color: INK });

  // gather unique accounts across themes
  const seen = new Set();
  const uniq = [];
  themes.forEach((t) => t.accounts.forEach((a) => { const k = a.toLowerCase(); if (!seen.has(k)) { seen.add(k); uniq.push(a); } }));
  uniq.sort((a, b) => a.localeCompare(b));

  s.addText(`${uniq.length} account${uniq.length === 1 ? "" : "s"} appear across the drivers above.`, { x: 0.72, y: 1.2, w: 11, h: 0.4, fontFace: SANS, fontSize: 13, color: SLATE });

  const cols = 4, colW = 3.0, x0 = 0.7, y0 = 1.75, rowH = 0.34;
  const perCol = Math.ceil(uniq.length / cols) || 1;
  uniq.forEach((name, i) => {
    const c = Math.floor(i / perCol), r = i % perCol;
    s.addText(name, { x: x0 + c * colW, y: y0 + r * rowH, w: colW - 0.15, h: rowH, fontFace: SANS, fontSize: 11, color: INK, valign: "middle", margin: 0 });
  });
}

await pres.writeFile({ fileName: outPath });
console.log(`Wrote ${outPath}  (${themes.length} themes, ${accountsAnalyzed} accounts)`);
