import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter } from "react-router-dom";
import { adminResources } from "./resources";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <Refine routerProvider={routerProvider} resources={adminResources} options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}>
        <AppRoutes />
      </Refine>
    </BrowserRouter>
  );
}
