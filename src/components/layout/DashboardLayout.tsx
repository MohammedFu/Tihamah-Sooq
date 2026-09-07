import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    const heading = mainRef.current?.querySelector<HTMLElement>(".content h1");
    heading?.focus();
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-sidebar-close]")?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-backdrop" aria-hidden="true" onMouseDown={() => setSidebarOpen(false)} />}
      <main className="main" ref={mainRef} id="main-content" tabIndex={-1} inert={sidebarOpen ? true : undefined}>
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى الرئيسي</a>
        <Header ref={menuButtonRef} onMenuClick={() => setSidebarOpen((current) => !current)} />
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}
