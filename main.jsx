import React from "react";
import { createRoot } from "react-dom/client";
import FinansIndex from "./FinansIndex.jsx";
import "./global.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FinansIndex />
  </React.StrictMode>
);
