import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "@tanstack/react-router";
import router from "./routes";
import { HostConfigProvider } from "./contexts/HostConfigContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HostConfigProvider>
      <RouterProvider router={router} />
    </HostConfigProvider>
  </StrictMode>,
);
