import { createRoot } from "react-dom/client";

import "../../packages/0g-ui/src/shell.source.css";
import "./playground.css";
import { App } from "./app";

createRoot(document.getElementById("root")!).render(<App />);
