import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "linear-gradient(180deg, rgba(5, 11, 24, 1), rgba(10, 20, 35, 1))",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            gap: "20px",
            padding: "20px",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ margin: "0", color: "rgba(255, 255, 255, 0.6)", textAlign: "center" }}>
            The application encountered an error. Try restarting or contact support.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "#ff6b6b",
                maxWidth: "400px",
                overflow: "auto",
                maxHeight: "150px",
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 24px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              marginTop: "10px",
            }}
          >
            Restart Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
