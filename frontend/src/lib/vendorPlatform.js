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

// Semantic tone for the admin dashboard's <Badge>, keyed by any vendor,
// invoice or document status.
const STATUS_TONES = {
  Approved: "success",
  Paid: "success",
  "Pending Review": "warning",
  Submitted: "warning",
  "Under Review": "info",
  Rejected: "danger",
  Inactive: "neutral",
};

export function statusTone(status) {
  return STATUS_TONES[status] || "neutral";
}

// Short form for headline figures ("NGN 1.77M"); pair with the full value in a title.
export function formatCurrencyCompact(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(amount || 0);
  } catch {
    return formatCurrency(amount, currency);
  }
}

export function formatCurrency(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}
