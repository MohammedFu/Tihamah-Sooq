import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import App from "./app/App";
import { ConfigurationErrorScreen } from "./components/ui/ConfigurationErrorScreen";
import { EnvironmentConfigurationError, getEnvironment } from "./config/env";
import "./styles/tokens.css";
import "./styles/index.css";

const root = createRoot(document.getElementById("root")!);

try {
  getEnvironment();
  root.render(<StrictMode><App /></StrictMode>);
} catch (error) {
  const issues = error instanceof EnvironmentConfigurationError
    ? error.issues
    : ["An unexpected configuration error occurred. Check the browser console for details."];

  console.error(error);
  root.render(<StrictMode><ConfigurationErrorScreen issues={issues} /></StrictMode>);
}
