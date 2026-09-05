import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter } from "react-router-dom";
import { adminResources } from "./resources";
import { AppRoutes } from "./routes";
import { adminAuthProvider } from "./authRuntime";
import { adminDataProvider } from "./providers";

export default function App() {
  return (
    <BrowserRouter>
      <Refine authProvider={adminAuthProvider} dataProvider={adminDataProvider} routerProvider={routerProvider} resources={adminResources} options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}>
        <AppRoutes />
      </Refine>
    </BrowserRouter>
  );
}
