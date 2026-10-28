import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ConsentPage from "./pages/ConsentPage.jsx";
import ExamPage from "./pages/ExamPage.jsx";
import "./styles.css";

const consentPath = window.location.pathname.match(/^\/autorizacion\/([^/]+)\/?$/);
const examPath = window.location.pathname.match(/^\/prueba-16pf\/([^/]+)\/?$/);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {consentPath ? (
      <ConsentPage token={consentPath[1]} />
    ) : examPath ? (
      <ExamPage token={examPath[1]} />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
