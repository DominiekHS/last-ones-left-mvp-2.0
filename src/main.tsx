import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { assertNoServiceRoleInClient } from "./lib/assert-no-service-role";

// Runtime "belt & suspenders" — faalt direct als er per ongeluk een
// service_role key in de browser bundle is beland (zie SECURITY.md).
assertNoServiceRoleInClient();

createRoot(document.getElementById("root")!).render(<App />);
