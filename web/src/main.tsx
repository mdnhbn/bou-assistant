import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AssistantStoreProvider } from "./store/AssistantStore";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AssistantStoreProvider><App /></AssistantStoreProvider>
  </React.StrictMode>,
);