import { ChevronRight } from "lucide-react";

const settings = [
  { title: "Marketplace profile", description: "Legal business details, contact information, and storefront identity." },
  { title: "Team & roles", description: "Admin access, permissions, and operational responsibilities." },
  { title: "Payments & commissions", description: "Payout timing, commission rules, and payment provider settings." },
  { title: "Integrations", description: "Delivery, notifications, analytics, and third-party services." },
];

export function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Tihamah-Sooq</p><h1>Settings</h1><p className="muted">Configure the operational foundation of the marketplace.</p></div>
      </div>
      <section className="card">
        {settings.map((setting) => (
          <button className="setting-row" type="button" key={setting.title}>
            <span><span className="setting-title">{setting.title}</span><span className="muted" style={{ display: "block" }}>{setting.description}</span></span>
            <ChevronRight className="setting-action" size={19} />
          </button>
        ))}
      </section>
    </>
  );
}
