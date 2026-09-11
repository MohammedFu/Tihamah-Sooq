import { Refine } from "@refinedev/core";
import routerProvider, { UnsavedChangesNotifier } from "@refinedev/react-router";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { I18nProvider } from "../i18n/I18nContext";
import { NotificationViewport } from "../components/ui/NotificationViewport";
import { adminResources } from "./resources";
import { AppRoutes } from "./routes";
import { adminAccessControlProvider, adminAuthProvider } from "./authRuntime";
import { adminDataProvider, adminNotificationProvider } from "./providers";

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <Refine accessControlProvider={adminAccessControlProvider} authProvider={adminAuthProvider} dataProvider={adminDataProvider} notificationProvider={adminNotificationProvider} routerProvider={routerProvider} resources={adminResources} options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}>
            <AppRoutes />
            <UnsavedChangesNotifier message="لديك تغييرات لم تُحفظ. هل تريد مغادرة الصفحة؟" />
            <NotificationViewport />
          </Refine>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  );
}
