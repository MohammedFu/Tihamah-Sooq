import { Globe } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, toggleLocale, t } = useI18n();

  return (
    <button
      className={`icon-button lang-switcher ${className ?? ""}`.trim()}
      type="button"
      onClick={toggleLocale}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={t.lang.switchLanguage}
    >
      <Globe aria-hidden="true" size={18} />
      <span className="lang-code">{locale === "ar" ? "EN" : "ع"}</span>
    </button>
  );
}
