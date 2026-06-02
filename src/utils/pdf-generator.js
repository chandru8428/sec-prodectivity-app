/**
 * PDF Generator — Saveetha Engineering College Lab Record Book
 * Format: White background | Header image | Blue header row | Plain black/white rows
 */
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Clean experiment title text:
 * - Decode any HTML entities (&amp; → &, &lt; → <, etc.)
 * - Normalize multiple spaces / newlines to single space
 * - Remove any stray HTML tags
 */
function cleanTitle(str) {
  if (!str) return '—';
  const txt = document.createElement('textarea');
  txt.innerHTML = String(str);
  let clean = txt.value;
  // Strip any leftover HTML tags
  clean = clean.replace(/<[^>]*>/g, '');
  // Collapse multiple spaces/newlines/tabs
  clean = clean.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return clean || '—';
}

/**
 * Safely split text so every word can be wrapped by jsPDF.
 * Inserts zero-width spaces or regular spaces inside words that are
 * longer than maxChars so splitTextToSize can break them.
 * Does NOT insert characters mid-&entity; sequences.
 */
function safeWrap(str, maxChars = 18) {
  if (!str) return '';
  return str.split(/\s+/).map(word => {
    if (word.length <= maxChars) return word;
    // Break the word into chunks without splitting mid-character
    const chunks = [];
    let pos = 0;
    while (pos < word.length) {
      chunks.push(word.slice(pos, pos + maxChars));
      pos += maxChars;
    }
    return chunks.join(' ');
  }).join(' ');
}

/**
 * Clip subsequent drawing to a rectangular region.
 * Works with jsPDF 2.x (saves/restores graphics state with W clip operator).
 */
function clipRect(pdf, x, y, w, h) {
  // Use low-level PDF operators for reliable clipping across jsPDF versions
  const k = pdf.internal.scaleFactor; // points per mm
  const pageH = pdf.internal.pageSize.getHeight();
  // PDF coordinate system: y=0 is bottom-left; jsPDF y=0 is top-left
  const pdfY = (pageH - y) * k;
  const pdfX = x * k;
  const pdfW = w * k;
  const pdfH = h * k;
  pdf.internal.write(`q ${pdfX} ${pdfY - pdfH} ${pdfW} ${pdfH} re W n`);
}

function restoreClip(pdf) {
  pdf.internal.write('Q');
}

export async function generateRecordBookPDF({ subject, code, experiments, studentName, registerNumber }) {
  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = 210;
  const ML   = 10; // left margin
  const MR   = 10; // right margin

  // ── White page ──
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, W, 297, 'F');

  // ── College header image ──
  let y = 6;
  try {
    const b64  = await loadImageAsBase64('/college-header.png');
    const imgW = W - ML - MR;
    const imgH = 24;
    pdf.addImage(b64, 'PNG', ML, y, imgW, imgH);
    y += imgH + 3;
  } catch {
    // Text fallback
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 153);
    pdf.text('SAVEETHA ENGINEERING COLLEGE', W / 2, y + 8, { align: 'center' });
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);
    pdf.text('Autonomous | Affiliated to Anna University | Approved by AICTE', W / 2, y + 14, { align: 'center' });
    y += 22;
  }

  // ── Divider ──
  pdf.setDrawColor(0, 51, 153);
  pdf.setLineWidth(0.5);
  pdf.line(ML, y, W - MR, y);
  y += 5;

  // ── Subject + heading ──
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12); pdf.setFont('helvetica', 'bold');
  pdf.text(`${code} - ${subject}`, W / 2, y, { align: 'center' });
  y += 6;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
  pdf.text('Table of content', W / 2, y, { align: 'center' });
  y += 7;

  // ── Column layout ──
  const cols = [
    { label: 'Exp',                    w: 13 },
    { label: 'Date',                   w: 23 },
    { label: 'Name of The Experiment', w: 84 },
    { label: 'QR Code',                w: 26 },
    { label: 'Mark',                   w: 17 },
    { label: 'Signature',              w: 27 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableX = (W - tableW) / 2;
  const hdrH   = 8;

  // The name column starts at this x offset from tableX
  const nameColX = tableX + cols[0].w + cols[1].w;

  // ── Header row ──
  pdf.setFillColor(255, 255, 255);
  pdf.rect(tableX, y, tableW, hdrH, 'F');
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.4);
  pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  let cx = tableX;
  cols.forEach(c => {
    pdf.rect(cx, y, c.w, hdrH, 'S');
    pdf.text(c.label, cx + c.w / 2, y + 5.3, { align: 'center' });
    cx += c.w;
  });
  y += hdrH;

  // ── Data rows ──
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.2);

  // Conservative text width for the name column.
  // We use ~83% of the column to compensate for bold font being wider
  // than what jsPDF's splitTextToSize measures.
  const NAME_TEXT_W = cols[2].w * 0.83; // ≈ 69.7mm
  const URL_TEXT_W  = cols[2].w * 0.88; // ≈ 73.9mm
  const TITLE_FONT  = 7;   // pt — smaller = more chars fit, fewer overflow
  const URL_FONT    = 5.5; // pt
  const LINE_H      = 3.4; // mm per line at 7pt

  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];

    // ── 1. Clean and measure the title ──
    const rawTitle = cleanTitle(exp.title);
    const safeTitle = safeWrap(rawTitle, 18);

    // IMPORTANT: set the SAME font that will be used for rendering
    // before calling splitTextToSize so metrics match exactly.
    pdf.setFontSize(TITLE_FONT);
    pdf.setFont('helvetica', 'bold');
    let titleLines = pdf.splitTextToSize(safeTitle, NAME_TEXT_W);
    if (titleLines.length > 6) {
      titleLines = titleLines.slice(0, 6);
      titleLines[5] = titleLines[5].replace(/\s+\S*$/, '') + '...';
    }

    // ── 2. Measure URL ──
    let urlLines = [];
    if (exp.repoUrl) {
      pdf.setFontSize(URL_FONT);
      pdf.setFont('helvetica', 'normal');
      // URLs have no spaces — force-break at fixed char intervals
      const safeUrl = safeWrap(exp.repoUrl, 30);
      urlLines = pdf.splitTextToSize(safeUrl, URL_TEXT_W);
      if (urlLines.length > 2) {
        urlLines = urlLines.slice(0, 2);
        urlLines[1] = urlLines[1].replace(/\s+\S*$/, '') + '...';
      }
    }

    // ── 3. Dynamic row height ──
    const titleBlockH = titleLines.length * LINE_H;
    const urlBlockH   = urlLines.length > 0 ? (urlLines.length * 2.4 + 1) : 0;
    const contentH    = 5 + titleBlockH + urlBlockH + 5;
    const rowH        = Math.max(26, contentH);

    // ── 4. Page break if needed ──
    if (y + rowH > 265) {
      pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, W, 297, 'F');
      y = 15;
    }

    // ── 5. Draw row background + borders ──
    pdf.setFillColor(255, 255, 255);
    pdf.rect(tableX, y, tableW, rowH, 'F');

    cx = tableX;
    pdf.setDrawColor(150, 150, 150);
    cols.forEach(c => {
      pdf.rect(cx, y, c.w, rowH, 'S');
      cx += c.w;
    });

    const num = exp.expNo || String(i + 1).padStart(2, '0');
    cx = tableX;

    // ── 6. Exp number ──
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(num, cx + cols[0].w / 2, y + rowH / 2 + 1.5, { align: 'center' });
    cx += cols[0].w;

    // ── 7. Date ──
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const dateStr = exp.date || '';
    if (dateStr) {
      const dateLines = pdf.splitTextToSize(dateStr, cols[1].w - 3);
      pdf.text(dateLines, cx + cols[1].w / 2, y + rowH / 2 + 1, { align: 'center' });
    }
    cx += cols[1].w;

    // ── 8. Experiment name + URL — CLIPPED to cell bounds ──
    clipRect(pdf, cx, y, cols[2].w, rowH);

    let ty = y + 5;
    pdf.setFontSize(TITLE_FONT);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(titleLines, cx + 2, ty);
    ty += titleLines.length * LINE_H + 1;

    if (urlLines.length > 0) {
      pdf.setFontSize(URL_FONT);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 200);
      pdf.text(urlLines, cx + 2, ty);
      pdf.setTextColor(0, 0, 0);
    }

    restoreClip(pdf);

    cx += cols[2].w;

    // ── 9. QR code ──
    if (exp.repoUrl) {
      try {
        const qr  = await QRCode.toDataURL(exp.repoUrl, { width: 120, margin: 1 });
        const qsz = 19;
        pdf.addImage(qr, 'PNG', cx + (cols[3].w - qsz) / 2, y + (rowH - qsz) / 2, qsz, qsz);
      } catch {}
    }
    cx += cols[3].w;
    // Mark & Signature — empty

    y += rowH;
  }

  // ── Footer ──
  y += 10;
  if (y > 265) {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, W, 297, 'F');
    y = 20;
  }

  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bolditalic');
  pdf.setTextColor(0, 0, 0);
  pdf.text('I confirm that the experiments and GitHub links provided are entirely my own work.', tableX, y);
  y += 10;

  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text(`Name : ${studentName || ''}`, tableX, y);
  pdf.text(`Register Number : ${registerNumber || ''}`, tableX + tableW / 2, y);
  y += 8;
  pdf.text('Date :', tableX, y);
  pdf.text("Learner's Signature", tableX + tableW / 2, y);

  return pdf;
}

export function downloadPDF(doc, filename) {
  doc.save(filename || 'lab-record-book.pdf');
}
