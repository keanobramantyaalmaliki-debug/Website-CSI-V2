import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist-mono";
import "../index.css";
import LabApp from "./LabApp";

// Entry TERPISAH (dev-only) untuk /lab — tidak menyentuh src/main.tsx produksi.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LabApp />
  </StrictMode>,
);
