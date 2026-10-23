import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ConsentPage from "./pages/ConsentPage.jsx";
import "./styles.css";

const consentPath = window.location.pathname.match(/^\/autorizacion\/([^/]+)\/?$/);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {consentPath ? <ConsentPage token={consentPath[1]} /> : <App />}
  </React.StrictMode>,
);
