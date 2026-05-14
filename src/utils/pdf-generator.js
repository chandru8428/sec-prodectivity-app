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

  // ── Header row (white bg, black bold text, grey border) ──
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

  // ── Data rows — plain white, thin black borders ──
  const rowH = 26;
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.2);

  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];

    if (y + rowH > 255) {
      pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, W, 297, 'F');
      y = 15;
    }

    // White row background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(tableX, y, tableW, rowH, 'F');

    // Cell borders (thin grey)
    cx = tableX;
    pdf.setDrawColor(150, 150, 150);
    cols.forEach(c => {
      pdf.rect(cx, y, c.w, rowH, 'S');
      cx += c.w;
    });

    const num  = exp.expNo || String(i + 1).padStart(2, '0');
    cx = tableX;

    // Exp number
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(num, cx + cols[0].w / 2, y + rowH / 2 + 1.5, { align: 'center' });
    cx += cols[0].w;

    // Date
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const dateStr = exp.date || '';
    if (dateStr) {
      const dateLines = pdf.splitTextToSize(dateStr, cols[1].w - 3);
      pdf.text(dateLines, cx + cols[1].w / 2, y + rowH / 2, { align: 'center' });
    }
    cx += cols[1].w;

    // Experiment name (bold) + URL (blue)
    let ty = y + 5;
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const titleLines = pdf.splitTextToSize(exp.title || '—', cols[2].w - 4);
    pdf.text(titleLines, cx + 2, ty);
    ty += titleLines.length * 3.6 + 1;

    if (exp.repoUrl) {
      pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 200);
      const urlLines = pdf.splitTextToSize(exp.repoUrl, cols[2].w - 4);
      pdf.text(urlLines, cx + 2, ty);
      pdf.setTextColor(0, 0, 0);
    }
    cx += cols[2].w;

    // QR code
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
