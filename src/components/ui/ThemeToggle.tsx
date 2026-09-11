import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      className={`icon-button theme-toggle ${className ?? ""}`.trim()}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "تفعيل المظهر الفاتح" : "تفعيل المظهر الداكن"}
      title={isDark ? "المظهر الفاتح" : "المظهر الداكن"}
    >
      {isDark ? (
        <Sun aria-hidden="true" size={18} />
      ) : (
        <Moon aria-hidden="true" size={18} />
      )}
    </button>
  );
}
