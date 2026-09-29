// Shared status-pill styling + currency formatting for the vendor-platform pages —
// used by both the admin dashboard and the public vendor portal.
const STATUS_STYLES = {
  Approved: "bg-teal-100 text-teal-700",
  Paid: "bg-teal-100 text-teal-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  Submitted: "bg-amber-100 text-amber-700",
  "Under Review": "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
  Inactive: "bg-black/5 text-slatey",
};

export function statusStyle(status) {
  return STATUS_STYLES[status] || "bg-black/5 text-slatey";
}

export function formatCurrency(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}
