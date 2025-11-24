import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OfficeTimeTracker from "./OfficeTimeTracker";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <OfficeTimeTracker />
  </StrictMode>
);
