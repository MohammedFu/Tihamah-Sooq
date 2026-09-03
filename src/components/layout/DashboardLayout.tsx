import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}
      <main className="main">
        <Header onMenuClick={() => setSidebarOpen((current) => !current)} />
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}
