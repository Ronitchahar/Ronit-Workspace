import { MessageSquare, FileText, FolderOpen, CalendarCheck, Settings, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

function Sidebar({ activePage, setActivePage, isSidebarOpen, setIsSidebarOpen }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 480;
      setIsMobile(mobile);
      
      // Close mobile menu on larger screens
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePageChange = (page) => {
    setActivePage(page);
    // Close mobile menu after selection
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const menuItems = [
    { icon: MessageSquare, label: 'Chats', id: 'chat' },
    { icon: FileText, label: 'Notes', id: 'notes' },
    { icon: FolderOpen, label: 'Files', id: 'files' },
    { icon: CalendarCheck, label: 'Tasks', id: 'tasks' },
  ];

  return (
    <>
      {/* Mobile/Tablet Sidebar Header */}
      <div className="sidebar" style={isMobile ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, width: '100%', height: 'auto', maxHeight: '70px', flexDirection: 'row' } : {}}>
        <div className="sidebar-header" style={isMobile ? { flex: 1, justifyContent: 'flex-start' } : {}}>
          {isMobileMenuOpen && isMobile ? (
            <h1 className="logo">R</h1>
          ) : isSidebarOpen ? (
            <div>
              <h1 className="logo">Ronit</h1>
              <p className="subtitle">Workspace AI</p>
            </div>
          ) : (
            <h1 className="logo logo-collapsed">R</h1>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        {isMobile && (
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* Desktop Menu */}
        {!isMobile && (
          <>
            <div className="menu">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={activePage === item.id ? "active" : ""}
                  aria-pressed={activePage === item.id}
                  onClick={() => handlePageChange(item.id)}
                  title={item.label}
                >
                  <item.icon size={20} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </button>
              ))}
            </div>

            <div className="bottom-section">
              <button
                type="button"
                className={activePage === "settings" ? "active" : ""}
                onClick={() => handlePageChange("settings")}
                title="Settings"
              >
                <Settings size={20} />
                {isSidebarOpen && <span>Settings</span>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="mobile-menu-dropdown"
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            background: 'var(--panel)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderTop: 'none',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? "active" : ""}
              onClick={() => handlePageChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                border: 'none',
                background: activePage === item.id ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                color: activePage === item.id ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '1rem',
                borderLeft: activePage === item.id ? '3px solid var(--accent)' : 'none',
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}

          {/* Settings in mobile menu */}
          <button
            type="button"
            className={activePage === "settings" ? "active" : ""}
            onClick={() => handlePageChange("settings")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              border: 'none',
              background: activePage === "settings" ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
              color: activePage === "settings" ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '1rem',
              borderLeft: activePage === "settings" ? '3px solid var(--accent)' : 'none',
              borderTop: '1px solid rgba(148, 163, 184, 0.12)',
              marginTop: '4px',
            }}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      )}

      {/* Mobile menu overlay - close on click */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 998,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 481px) {
          .sidebar {
            display: flex !important;
            flex-direction: column !important;
            position: static !important;
            height: auto !important;
            max-height: none !important;
          }

          .mobile-menu-toggle {
            display: none !important;
          }

          .mobile-menu-dropdown {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

export default Sidebar;