import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "leaflet/dist/leaflet.css";
import "./research-theme.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing application root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
