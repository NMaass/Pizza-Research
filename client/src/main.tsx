import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@nmaass/research-ui/theme.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
