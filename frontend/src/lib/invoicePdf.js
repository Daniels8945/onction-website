import { jsPDF } from "jspdf";

// Shared by the admin Invoices page and the vendor portal — a simple, formatted
// invoice PDF. The original vendor-registration app never finished this (it only
// downloaded plain text), so this closes that gap rather than porting it.
export function downloadInvoicePdf(invoice, { companyName = "Onction Service Limited", vendorName = "", currency = "NGN" } = {}) {
  const doc = new jsPDF();
  const money = (n) => `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  doc.setFontSize(16);
  doc.text(companyName, 14, 20);
  doc.setFontSize(11);
  doc.text("Invoice", 14, 28);

  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 14, 40);
  doc.text(`Status: ${invoice.status}`, 14, 46);
  doc.text(`Submitted: ${new Date(invoice.submitted_at).toLocaleDateString()}`, 14, 52);
  if (invoice.due_date) doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 14, 58);
  if (vendorName) doc.text(`Vendor: ${vendorName}`, 120, 40);
  if (invoice.service_name) doc.text(`Service: ${invoice.service_name}`, 120, 46);

  let y = 70;
  if (invoice.description) {
    doc.text("Description:", 14, y);
    doc.text(doc.splitTextToSize(invoice.description, 180), 14, y + 6);
    y += 16;
  }

  if (invoice.line_items?.length) {
    doc.setFont(undefined, "bold");
    doc.text("Item", 14, y);
    doc.text("Qty", 110, y);
    doc.text("Unit price", 135, y);
    doc.text("Amount", 170, y);
    doc.setFont(undefined, "normal");
    y += 6;
    for (const item of invoice.line_items) {
      doc.text(item.description || "—", 14, y);
      doc.text(String(item.quantity), 110, y);
      doc.text(money(item.unit_price), 135, y);
      doc.text(money(item.amount), 170, y);
      y += 6;
    }
    y += 4;
  }

  doc.setFont(undefined, "bold");
  doc.text(`Total: ${money(invoice.amount)}`, 14, y);
  doc.setFont(undefined, "normal");

  if (invoice.payment_date) {
    y += 10;
    doc.text(`Paid ${new Date(invoice.payment_date).toLocaleDateString()} via ${invoice.payment_method || "—"}`, 14, y);
  }

  doc.save(`${invoice.invoice_number}.pdf`);
}
