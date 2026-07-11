import React from "react";

// Without this, any uncaught error during render silently blanks the
// whole page in production — React unmounts the tree and shows nothing,
// with the real error only visible in the browser console (which is
// hard to reach on mobile). This catches it and shows the message
// directly on screen instead.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[SixInsider] Uncaught render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            backgroundColor: "#0A0E1A",
            color: "#E7E9F0",
            fontFamily: "monospace",
            padding: 20,
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <div style={{ color: "#FB4570", fontWeight: "bold", marginBottom: 12 }}>
            SixInsider crashed — details below:
          </div>
          {String(this.state.error?.message || this.state.error)}
          {this.state.error?.stack ? (
            <div style={{ marginTop: 16, color: "#94A0C2", fontSize: 11 }}>
              {this.state.error.stack}
            </div>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}
