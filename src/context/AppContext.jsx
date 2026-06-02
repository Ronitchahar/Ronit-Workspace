 import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, signOut, cleanupStaleDeviceSessions } from "../services/authService";
import { getUserActiveSessions } from "../services/sessionManagementService";
import { startPeriodicCleanup, stopPeriodicCleanup } from "../services/sessionCleanupService";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAIText, setPendingAIText] = useState("");
  const [currentSession, setCurrentSession] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initUser() {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            // Start periodic cleanup for stale sessions
            try {
              startPeriodicCleanup(currentUser.id);
            } catch (e) {
              console.warn("Failed to start periodic cleanup:", e);
            }

            // Cleanup stale sessions on app startup
            try {
              await cleanupStaleDeviceSessions(currentUser.id);
            } catch (e) {
              console.warn("Failed to cleanup stale sessions:", e);
            }

            // Initialize profile with username and cached avatar
            const prof = {
              username: currentUser.username,
              avatar_url: currentUser.avatar_url || null,
            };

            setProfile(prof);

            // Fetch the latest global avatar from Supabase asynchronously to keep it fresh
            import("../services/dbService").then(({ safeQuery }) => {
              import("../services/supabase").then(({ supabase }) => {
                safeQuery(
                  supabase
                    .from("users")
                    .select("avatar_url")
                    .eq("id", currentUser.id)
                    .single(),
                  null
                ).then(({ data }) => {
                  if (data?.avatar_url && mounted) {
                    setProfile((prev) => ({
                      ...prev,
                      avatar_url: data.avatar_url,
                    }));

                    // Update local storage so it's cached for next fast boot
                    const stored = localStorage.getItem("workspace_auth_user");
                    if (stored) {
                      try {
                        const userObj = JSON.parse(stored);
                        userObj.avatar_url = data.avatar_url;
                        localStorage.setItem(
                          "workspace_auth_user",
                          JSON.stringify(userObj)
                        );
                      } catch (e) {}
                    }
                  }
                });
              });
            });

            // Load active sessions
            try {
              const sessionsResult = await getUserActiveSessions(currentUser.id);
              if (mounted && sessionsResult.sessions) {
                setActiveSessions(sessionsResult.sessions);
                // Set current session (most recent)
                if (sessionsResult.sessions.length > 0) {
                  setCurrentSession(sessionsResult.sessions[0]);
                }
              }
            } catch (e) {
              console.warn("Failed to load active sessions:", e);
            }
          } else {
            setProfile(null);
            setCurrentSession(null);
            setActiveSessions([]);
            // Stop cleanup if user logs out
            stopPeriodicCleanup();
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing user:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initUser();

    // Listen for instant avatar updates
    const handleAvatarUpdate = (e) => {
      if (mounted && e.detail) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: e.detail } : null));
        // Also update the current user object in state
        setUser((prev) => (prev ? { ...prev, avatar_url: e.detail } : null));
      }
    };

    window.addEventListener("avatar_updated", handleAvatarUpdate);

    // Setup update listeners if running in Electron
    if (window.electron) {
      window.electron.on("update-available", (data) => {
        console.log("🔄 Update available:", data.version);
        setUpdateAvailable(data);
      });

      window.electron.on("download-progress", (data) => {
        console.log("📥 Download progress:", data.percent);
        setUpdateProgress(data);
      });

      window.electron.on("update-downloaded", () => {
        console.log("✅ Update downloaded");
        setUpdateDownloaded(true);
      });
    }

    return () => {
      mounted = false;
      window.removeEventListener("avatar_updated", handleAvatarUpdate);
    };
  }, []);

  const logout = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    setCurrentSession(null);
    setActiveSessions([]);
  };

  const refreshActiveSessions = async () => {
    if (!user?.id) return;
    try {
      const sessionsResult = await getUserActiveSessions(user.id);
      if (sessionsResult.sessions) {
        setActiveSessions(sessionsResult.sessions);
        if (sessionsResult.sessions.length > 0) {
          setCurrentSession(sessionsResult.sessions[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to refresh active sessions:", e);
    }
  };

  const installUpdate = () => {
    if (window.electron && updateDownloaded) {
      window.electron.send("restart-app");
    }
  };

  const checkForUpdates = () => {
    if (window.electron) {
      window.electron.send("check-for-updates");
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        profile,
        setProfile,
        loading,
        logout,
        pendingAIText,
        setPendingAIText,
        currentSession,
        activeSessions,
        refreshActiveSessions,
        updateAvailable,
        updateProgress,
        updateDownloaded,
        installUpdate,
        checkForUpdates,
      }}
    >
      {!loading && children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
