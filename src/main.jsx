import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "@tanstack/react-router";
import router from "./routes";
import { RetentionConfigProvider } from "./contexts/RetentionConfigContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RetentionConfigProvider>
      <RouterProvider router={router} />
    </RetentionConfigProvider>
  </StrictMode>,
);
