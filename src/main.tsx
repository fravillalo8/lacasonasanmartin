import { StrictMode, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("App crash:", error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#fff", color: "#111", padding: "2rem", fontFamily: "monospace", minHeight: "100vh" }}>
          <h2>Error al cargar la aplicación</h2>
          <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: "8px", overflow: "auto", fontSize: "12px" }}>
            {(this.state.error as Error).message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
            Recargar
          </button>
        </div>
      )
    }
    return this.state.error ? null : this.props.children
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
