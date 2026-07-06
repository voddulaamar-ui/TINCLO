import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter";
import OfflineBanner from "./components/OfflineBanner";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import "./index.css";

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineBanner />
    <AppRouter />
    <PwaInstallPrompt />
  </React.StrictMode>
);
