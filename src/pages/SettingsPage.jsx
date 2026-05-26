import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { updateUserAvatarUrl } from "../services/authService";
import { deactivateSession, deactivateOtherSessions } from "../services/sessionManagementService";
import { getDeviceId } from "../services/deviceUtility";
import { useToast } from "../context/ToastContext";

function SettingsPage({ theme, setTheme }) {
  const { user, profile, setProfile, logout, activeSessions, refreshActiveSessions } = useAppContext();
  const { addToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState({});
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Get current device ID and load sessions
  useEffect(() => {
    let mounted = true;

    async function initDevice() {
      try {
        const deviceId = await getDeviceId();
        if (mounted) {
          setCurrentDeviceId(deviceId);
        }
      } catch (e) {
        console.error("Failed to get device ID:", e);
      }
    }

    initDevice();

    return () => {
      mounted = false;
    };
  }, []);
  
  const handleLogout = async () => {
    await logout();
  };

  const handleLogoutDevice = async (sessionId, deviceName) => {
    try {
      setLogoutLoading((prev) => ({ ...prev, [sessionId]: true }));

      const result = await deactivateSession(sessionId);
      if (result.success) {
        addToast(`Logged out from ${deviceName}.`, "success");
        await refreshActiveSessions();
      } else {
        addToast(`Failed to logout from ${deviceName}.`, "error");
      }
    } catch (error) {
      console.error("Error logging out device:", error);
      addToast("Failed to logout from device.", "error");
    } finally {
      setLogoutLoading((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleLogoutOthers = async () => {
    if (!user?.id) return;

    try {
      setLoadingSessions(true);

      // Get current session ID
      const localStorage_session = localStorage.getItem("workspace_session_id");
      if (!localStorage_session) {
        addToast("Could not identify current session.", "error");
        return;
      }

      const result = await deactivateOtherSessions(user.id, localStorage_session);
      if (result.success) {
        addToast(
          `Logged out ${result.deactivatedCount} other device(s).`,
          "success"
        );
        await refreshActiveSessions();
      } else {
        addToast("Failed to logout other devices.", "error");
      }
    } catch (error) {
      console.error("Error logging out other devices:", error);
      addToast("Failed to logout other devices.", "error");
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Resize and crop to center
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;
        
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        
        try {
          // Upload directly to Supabase DB (Bypassing Storage Bucket RLS issues)
          const newAvatarUrl = await updateUserAvatarUrl(user.id, compressedBase64);
          if (newAvatarUrl) {
            setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
          }
        } catch (err) {
          console.error("Failed to save avatar globally:", err);
        } finally {
          setIsUploading(false);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="files-bento-page page-transition" style={{ overflowY: "auto" }}>
      <div className="bento-header">
        <h1 className="gradient-text-hero">Settings</h1>
        <p>Configure your AI Workspace and manage your account.</p>
      </div>

      <div className="bento-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "800px", margin: "0 auto" }}>
        {/* Profile Information */}
        <div className="bento-item fade-in-up" style={{ padding: "32px" }}>
          <h2 style={{ marginBottom: "24px" }}>Profile Information</h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            {/* Avatar Section */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "32px",
                      color: "var(--text)",
                      fontWeight: "bold",
                    }}
                  >
                    {profile?.username?.[0]?.toUpperCase() ||
                      user?.username?.[0]?.toUpperCase() ||
                      "👤"}
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="avatar-upload"
                  style={{
                    padding: "10px 20px",
                    background: "var(--accent)",
                    color: "#fff",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "inline-block",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 12px var(--accent-soft)",
                  }}
                >
                  Change Avatar
                </label>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                  }}
                >
                  JPG, PNG or WEBP (Max 5MB)
                </p>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-muted)",
                }}
              >
                Username
              </label>
              <div
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                {profile?.username || user?.username || "Guest"}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                fontWeight: "bold",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Active Devices */}
        <div className="bento-item fade-in-up" style={{ padding: "32px" }}>
          <h2 style={{ marginBottom: "24px" }}>Active Devices</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Manage your active sessions across devices. Maximum 3 devices allowed.
          </p>

          {activeSessions.length === 0 ? (
            <div
              style={{
                padding: "20px",
                borderRadius: "8px",
                background: "rgba(0,0,0,0.1)",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              No active sessions found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeSessions.map((session) => {
                const isCurrentDevice = session.device_id === currentDeviceId;
                const loginTime = session.created_at
                  ? new Date(session.created_at)
                  : null;
                const lastActive = session.last_active
                  ? new Date(session.last_active)
                  : null;

                const formatTime = (date) => {
                  if (!date) return "Unknown";
                  const now = new Date();
                  const diff = now - date;
                  const minutes = Math.floor(diff / 60000);
                  const hours = Math.floor(diff / 3600000);
                  const days = Math.floor(diff / 86400000);

                  if (minutes < 1) return "Just now";
                  if (minutes < 60)
                    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
                  if (hours < 24)
                    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
                  if (days < 7)
                    return `${days} day${days !== 1 ? "s" : ""} ago`;
                  return date.toLocaleDateString();
                };

                return (
                  <div
                    key={session.id}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      background: isCurrentDevice
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(0,0,0,0.2)",
                      border: isCurrentDevice
                        ? "1px solid rgba(34, 197, 94, 0.3)"
                        : "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontWeight: "600", color: "var(--text)" }}>
                          {session.device_name || "Unknown Device"}
                        </span>
                        {isCurrentDevice && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              background: "rgba(34, 197, 94, 0.2)",
                              color: "#22c55e",
                              borderRadius: "4px",
                              fontWeight: "600",
                            }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginBottom: "4px",
                        }}
                      >
                        {session.platform || "Unknown Platform"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Logged in: {loginTime?.toLocaleString() || "Unknown"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Last active: {formatTime(lastActive)}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleLogoutDevice(
                          session.id,
                          session.device_name || "Device"
                        )
                      }
                      disabled={logoutLoading[session.id] || isCurrentDevice}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "6px",
                        background: isCurrentDevice
                          ? "rgba(0,0,0,0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                        color: isCurrentDevice ? "var(--text-muted)" : "#ef4444",
                        fontWeight: "600",
                        border: isCurrentDevice
                          ? "1px solid var(--border)"
                          : "1px solid rgba(239, 68, 68, 0.3)",
                        cursor: isCurrentDevice
                          ? "not-allowed"
                          : "pointer",
                        opacity: logoutLoading[session.id] ? 0.6 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {logoutLoading[session.id] ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeSessions.length > 1 && (
            <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
              <button
                onClick={handleLogoutOthers}
                disabled={loadingSessions}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(249, 115, 22, 0.1)",
                  color: "#f97316",
                  fontWeight: "600",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  cursor: loadingSessions ? "not-allowed" : "pointer",
                  opacity: loadingSessions ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loadingSessions
                  ? "Logging out other devices..."
                  : "Logout All Other Devices"}
              </button>
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                Sign out from all other devices while keeping this one active.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
