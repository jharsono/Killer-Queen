/**
 * Client entry: mount the React menu chrome. The field renderer (non-React)
 * is driven from inside App via the socket connection.
 */
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app root element");
createRoot(root).render(<App />);
