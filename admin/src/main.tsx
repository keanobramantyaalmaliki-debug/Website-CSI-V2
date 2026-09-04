/**
 * Titik masuk panel admin.
 *
 * Tanpa StrictMode dengan sengaja. Panel ini penuh efek yang memanggil API, dan
 * pemanggilan ganda ala StrictMode di mode dev membuat setiap unggahan dan
 * setiap simpanan terkirim dua kali — perilaku yang hanya muncul di lokal dan
 * membingungkan justru saat sedang mencari bug betulan.
 */

import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

const akar = document.getElementById("root");
if (!akar) throw new Error("Elemen #root tidak ditemukan di admin/index.html");

createRoot(akar).render(<App />);
