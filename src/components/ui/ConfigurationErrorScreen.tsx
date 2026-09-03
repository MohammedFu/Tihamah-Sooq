import { CircleAlert } from "lucide-react";

export function ConfigurationErrorScreen({ issues }: { issues: readonly string[] }) {
  return (
    <main className="configuration-error-shell">
      <section className="configuration-error-panel" aria-labelledby="configuration-error-title">
        <span className="configuration-error-icon" aria-hidden="true"><CircleAlert size={24} /></span>
        <div>
          <p className="eyebrow">إعدادات التشغيل</p>
          <h1 id="configuration-error-title">تعذر تشغيل لوحة التحكم</h1>
          <p className="muted">تحقق من متغيرات البيئة التالية ثم أعد تشغيل التطبيق.</p>
        </div>
        <ul>
          {issues.map((issue) => <li key={issue} dir="ltr">{issue}</li>)}
        </ul>
      </section>
    </main>
  );
}
