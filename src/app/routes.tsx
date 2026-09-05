import { Authenticated } from "@refinedev/core";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { AuthCheckingScreen, LoginPage } from "../features/auth";
import { AuthorizedRoute } from "../features/auth/components/AuthorizedRoute";
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
      <Route path="/login" element={<LoginPage />} />
      <Route element={
        <Authenticated key="dashboard-routes" fallback={<LoginRedirect />} loading={<AuthCheckingScreen />}>
          <DashboardLayout />
        </Authenticated>
      }>
        <Route index element={<AuthorizedRoute resource="dashboard"><OverviewPage /></AuthorizedRoute>} />
        <Route path="/listings" element={<AuthorizedRoute resource="listings"><ListingsPage /></AuthorizedRoute>} />
        <Route path="/users" element={<AuthorizedRoute resource="users"><UsersPage /></AuthorizedRoute>} />
        <Route path="/commissions" element={<AuthorizedRoute resource="commissions"><CommissionsPage /></AuthorizedRoute>} />
        <Route path="/reports" element={<AuthorizedRoute resource="reports"><ReportsPage /></AuthorizedRoute>} />
        <Route path="/locations" element={<AuthorizedRoute resource="locations"><LocationsPage /></AuthorizedRoute>} />
        <Route path="/categories" element={<AuthorizedRoute resource="categories"><CategoriesPage /></AuthorizedRoute>} />
        <Route path="/banners" element={<AuthorizedRoute resource="banners"><BannersPage /></AuthorizedRoute>} />
        <Route path="/system" element={<AuthorizedRoute resource="system"><SystemPage /></AuthorizedRoute>} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}

function LoginRedirect() {
  const location = useLocation();
  const from = { pathname: location.pathname, search: location.search, hash: location.hash };
  return <Navigate replace state={{ from }} to="/login" />;
}
