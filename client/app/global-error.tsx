"use client";

/**
 * Root-layout crash fallback. Must render its own <html>/<body> because the
 * root layout itself failed. Last-resort recovery instead of a blank tab.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: "#666", fontSize: 14, maxWidth: 380 }}>
            BEYONDVYU hit an unexpected error. Your data is safe — reload to
            continue.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: "#1c3a35",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
