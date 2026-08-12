// challan.pdf.ts: renders a challan as a downloadable PDF (Part F.1,
// bonus feature). Kept separate from challan.service.ts since this is
// presentation logic, not business logic -- it only reads data that
// createChallan/confirmChallan/etc already produced.

import PDFDocument from "pdfkit";
import type { Response } from "express";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

const COLUMN_X = { product: 50, qty: 300, price: 370, subtotal: 460 };
const PAGE_RIGHT_EDGE = 545;

function formatMoney(value: unknown): string {
  return `Rs. ${Number(value).toFixed(2)}`;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export async function streamChallanPdf(challanId: string, res: Response): Promise<void> {
  const challan = await prisma.challan.findUnique({
    where: { id: challanId },
    include: {
      items: true,
      customer: { select: { name: true, mobile: true, address: true, type: true } },
    },
  });
  if (!challan) {
    throw new AppError(404, "Challan not found");
  }

  // createdBy is stored as a plain user id (same pattern as
  // CustomerNote/StockMovement), so look up the name separately for a
  // readable "created by" line instead of printing a raw id.
  const creator = await prisma.user.findUnique({
    where: { id: challan.createdBy },
    select: { name: true },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${challan.challanNumber}.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(res);

  // -- Company header --
  doc.fontSize(20).fillColor("#123531").text("Fundsroom", 50, 50);
  doc.fontSize(10).fillColor("#57534a").text("Mini ERP + CRM Portal", 50, 74);

  // -- Challan number, date, status --
  doc
    .fontSize(16)
    .fillColor("#1c1a17")
    .text(challan.challanNumber, 50, 110);
  doc
    .fontSize(10)
    .fillColor("#57534a")
    .text(`Date: ${formatDate(challan.createdAt)}`, 50, 132)
    .text(`Status: ${challan.status}`, 50, 148);

  // -- Customer details --
  doc.fontSize(11).fillColor("#1c1a17").text("Bill To", 350, 110, { underline: true });
  doc
    .fontSize(10)
    .fillColor("#57534a")
    .text(challan.customer.name, 350, 128)
    .text(challan.customer.mobile, 350, 143)
    .text(challan.customer.address, 350, 158, { width: 195 })
    .text(challan.customer.type, 350, 188);

  // -- Item table --
  let y = 230;
  doc.fontSize(10).fillColor("#1c1a17");
  doc.text("Product", COLUMN_X.product, y);
  doc.text("Qty", COLUMN_X.qty, y);
  doc.text("Unit Price", COLUMN_X.price, y);
  doc.text("Subtotal", COLUMN_X.subtotal, y);
  y += 15;
  doc.moveTo(50, y).lineTo(PAGE_RIGHT_EDGE, y).strokeColor("#e6e0d4").stroke();
  y += 10;

  let grandTotal = 0;
  doc.fontSize(10).fillColor("#1c1a17");
  for (const item of challan.items) {
    // Start a fresh page if this row would run off the bottom margin.
    if (y > 750) {
      doc.addPage();
      y = 50;
    }

    const subtotal = Number(item.unitPriceSnapshot) * item.quantity;
    grandTotal += subtotal;

    doc.text(`${item.productNameSnapshot} (${item.productSkuSnapshot})`, COLUMN_X.product, y, { width: 240 });
    doc.text(String(item.quantity), COLUMN_X.qty, y);
    doc.text(formatMoney(item.unitPriceSnapshot), COLUMN_X.price, y);
    doc.text(formatMoney(subtotal), COLUMN_X.subtotal, y);
    y += 22;
  }

  y += 5;
  doc.moveTo(50, y).lineTo(PAGE_RIGHT_EDGE, y).strokeColor("#e6e0d4").stroke();
  y += 12;
  doc.fontSize(12).fillColor("#1c1a17").text("Grand Total", COLUMN_X.price, y);
  doc.text(formatMoney(grandTotal), COLUMN_X.subtotal, y);

  // -- Footer: created-by/date --
  // Positioned relative to the page's own printable height (rather
  // than a hardcoded y) so it can't land past the bottom margin --
  // doc.text() auto-paginates once a y goes past the margin box, which
  // was silently pushing this line onto its own second page.
  const footerY = doc.page.height - doc.page.margins.bottom - 20;
  doc
    .fontSize(9)
    .fillColor("#8a8578")
    .text(
      `Created by ${creator?.name ?? "Unknown"} on ${formatDate(challan.createdAt)}`,
      50,
      footerY,
      { align: "left" }
    );

  doc.end();
}
