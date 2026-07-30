import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist-mono";
import "../../index.css";
import MatterGallery from "./MatterGallery";

// Entry TERPISAH (dev-only) untuk galeri Matter.js 2D — tidak menyentuh App.tsx
// produksi. Sejajar dengan src/lab/main.tsx (lab cannon-es 3D).
// MatterLab (single-scene + leva) tetap ada sebagai referensi; galeri ini yang
// dipakai karena menyediakan 10 scene + dropdown.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MatterGallery />
  </StrictMode>,
);
