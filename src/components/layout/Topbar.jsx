import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useAppContext } from "../../context/AppContext";

function Topbar({ theme, setTheme, isSidebarOpen, setIsSidebarOpen }) {
  const { notifications, clearNotifications } = useToast();
  const { profile } = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="glass-btn sidebar-toggle-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          ☰
        </button>
        <div>
          <h2>Ronit Workspace</h2>
          <p>Your Personal AI Assistant</p>
        </div>
      </div>

      <div className="topbar-actions" style={{ position: "relative" }}>
        <button
          className="glass-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <button 
          className="glass-btn" 
          aria-label="Notifications"
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ position: "relative" }}
        >
          🔔
          {notifications.length > 0 && (
            <span style={{
              position: "absolute", top: "0px", right: "0px", background: "var(--danger, #ef4444)",
              width: "12px", height: "12px", borderRadius: "50%", border: "2px solid #000"
            }}></span>
          )}
        </button>
        
        {showNotifications && (
          <div className="notification-panel fade-in-up" style={{
            position: "absolute", top: "60px", right: "60px", width: "320px", maxHeight: "400px",
            background: "var(--panel)", backdropFilter: "blur(12px)", border: "1px solid var(--border)",
            borderRadius: "16px", boxShadow: "var(--shadow)", overflowY: "auto", zIndex: 1000,
            padding: "16px", color: "var(--text)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Notifications</h3>
              <button onClick={clearNotifications} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: "bold" }}>Clear All</button>
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "32px" }}>No recent notifications.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ 
                    padding: "12px", borderRadius: "8px", background: "rgba(128,128,128,0.05)",
                    borderLeft: `4px solid ${n.type === 'error' ? '#ef4444' : n.type === 'success' ? '#22c55e' : 'var(--accent)'}`
                  }}>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text)" }}>{n.message}</p>
                    <small style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                      {n.time.toLocaleTimeString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="glass-btn" aria-label="Profile" style={{ padding: profile?.avatar_url ? "0" : undefined, overflow: "hidden" }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
              {profile?.username?.[0]?.toUpperCase() || "👤"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default Topbar;