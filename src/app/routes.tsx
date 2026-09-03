import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { BannersPage } from "../features/banners/pages/BannersPage";
import { CategoriesPage } from "../features/categories/pages/CategoriesPage";
import { CommissionsPage } from "../features/commissions/pages/CommissionsPage";
import { OverviewPage } from "../features/dashboard/pages/OverviewPage";
import { ListingsPage } from "../features/listings/pages/ListingsPage";
import { LocationsPage } from "../features/locations/pages/LocationsPage";
import { ReportsPage } from "../features/reports/pages/ReportsPage";
import { SystemPage } from "../features/system/pages/SystemPage";
import { UsersPage } from "../features/users/pages/UsersPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/banners" element={<BannersPage />} />
        <Route path="/system" element={<SystemPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
