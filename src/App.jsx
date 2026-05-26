import { useEffect, useState } from "react";

import { useAppContext } from "./context/AppContext";

import {
  startWindowStatePreservation,
  stopWindowStatePreservation,
} from "./utils/windowState";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";

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

  // Navigation listener
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

  // Auth page
  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
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
            setTheme={setTheme}
          />
        );

      default:
        return <ChatPage />;
    }
  };

  return (
    <div
      className={`app ${theme} ${
        isSidebarOpen
          ? "sidebar-open"
          : "sidebar-closed"
      }`}
    >
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="main-area">
        <Topbar
          theme={theme}
          setTheme={setTheme}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {renderPage()}
      </div>
    </div>
  );
}

export default App;