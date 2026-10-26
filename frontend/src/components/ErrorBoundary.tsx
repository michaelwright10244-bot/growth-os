import { Component, ErrorInfo, ReactNode } from "react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Career OS render failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24, color: "#24292f", fontFamily: "sans-serif" }}>
      <p style={{ color: "#00855a", fontSize: 12, letterSpacing: "0.08em" }}>CAREER OS</p>
      <h1 style={{ fontSize: 24 }}>页面加载失败</h1>
      <p>请刷新页面；如果问题仍在，请把下面的信息发给开发者。</p>
      <pre style={{ overflow: "auto", padding: 12, background: "#f2f5f3", whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
      <button onClick={() => location.reload()} style={{ padding: "8px 12px", border: 0, borderRadius: 4, color: "white", background: "#00855a" }}>重新加载</button>
    </main>;
  }
}
