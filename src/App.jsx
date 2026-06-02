import { useEffect, useState, useCallback, useMemo } from "react";

import { useAppContext } from "./context/AppContext";

import {
  startWindowStatePreservation,
  stopWindowStatePreservation,
} from "./utils/windowState";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import UpdateNotification from "./components/common/UpdateNotification";

import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import NotesPage from "./pages/NotesPage";
import FilesPage from "./pages/FilesPage";
import TasksPage from "./pages/TasksPage";
import SettingsPage from "./pages/SettingsPage";

import "./styles/App.css";

function App() {
  const { user } = useAppContext();

  const [activePage, setActivePage] = useState("chat");

  const [theme, setTheme] = useState("dark");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Window state preservation
  useEffect(() => {
    startWindowStatePreservation();

    return () => {
      stopWindowStatePreservation();
    };
  }, []);

  // Theme handling
  useEffect(() => {
    document.body.classList.remove("light", "dark");

    document.body.classList.add(theme);
  }, [theme]);

  // Navigation listener - memoized
  useEffect(() => {
    const handleNavigate = () => {
      setActivePage("chat");
    };

    window.addEventListener(
      "NAVIGATE_TO_CHAT",
      handleNavigate
    );

    return () => {
      window.removeEventListener(
        "NAVIGATE_TO_CHAT",
        handleNavigate
      );
    };
  }, []);

  // Memoized callbacks to prevent unnecessary rerenders
  const handleSetActivePage = useCallback((page) => {
    setActivePage(page);
  }, []);

  const handleSetTheme = useCallback((newTheme) => {
    setTheme(newTheme);
  }, []);

  const handleSetSidebarOpen = useCallback((isOpen) => {
    setIsSidebarOpen(isOpen);
  }, []);

  // Auth page
  if (!user) {
    return <AuthPage />;
  }

  // Memoized page rendering to prevent unnecessary recalculation
  const renderedPage = useMemo(() => {
    switch (activePage) {
      case "notes":
        return <NotesPage />;

      case "files":
        return <FilesPage />;

      case "tasks":
        return <TasksPage />;

      case "settings":
        return (
          <SettingsPage
            theme={theme}
            setTheme={handleSetTheme}
          />
        );

      default:
        return <ChatPage />;
    }
  }, [activePage, theme]);

  // Memoized class name
  const appClassName = useMemo(() => {
    return `app ${theme} ${
      isSidebarOpen
        ? "sidebar-open"
        : "sidebar-closed"
    }`;
  }, [theme, isSidebarOpen]);

  return (
    <div className={appClassName}>
      <UpdateNotification />
      
      <Sidebar
        activePage={activePage}
        setActivePage={handleSetActivePage}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={handleSetSidebarOpen}
      />

      <div className="main-area">
        <Topbar
          theme={theme}
          setTheme={handleSetTheme}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={handleSetSidebarOpen}
        />

        {renderedPage}
      </div>
    </div>
  );
}

export default App;