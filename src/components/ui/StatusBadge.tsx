const labels: Record<string, string> = {
  pending_review: "قيد المراجعة", active: "نشط", sold: "تم البيع", rejected: "مرفوض", banned: "محظور",
  unpaid: "غير مسدد", paid: "بانتظار التدقيق", verified: "مسدد ومعتمد",
  open: "مفتوح", resolved: "مغلق", enabled: "مفعل", disabled: "معطل",
  scheduled: "مجدول", expired: "منتهي",
};

export function StatusBadge({ value }: { value: string }) {
  const tone = ["active", "verified", "resolved", "enabled"].includes(value)
    ? "success"
    : ["pending_review", "paid", "unpaid", "scheduled"].includes(value)
      ? "warning"
      : ["rejected", "disabled", "banned", "expired"].includes(value)
        ? "danger"
        : "info";
  return <span className={`badge ${tone}`}>{labels[value] ?? value}</span>;
}
