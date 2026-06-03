import NotesList from "./NotesList";

function NotesSidebar({
  notes,
  selectedNote,
  setSelectedNote,
  addNote,
  deleteNote,
  togglePin,
  searchQuery,
  setSearchQuery,
  collapsed,
  setCollapsed,
}) {
  return (
    <div className={`notes-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="notes-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2>Notes</h2>
            <button
              onClick={() => setCollapsed(true)}
              className="sidebar-toggle-btn-inside"
              title="Collapse Sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <path d="M16 15l-3-3 3-3"/>
              </svg>
            </button>
          </div>
          <p className="notes-subtitle">Search, pin, and edit notes.</p>
        </div>

        <button className="add-note-btn glass-btn" onClick={addNote} aria-label="Add note">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="notes-search">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
          />
        </div>
      </div>

      <NotesList
        notes={notes}
        selectedNote={selectedNote}
        setSelectedNote={setSelectedNote}
        togglePin={togglePin}
        deleteNote={deleteNote}
      />
    </div>
  );
}

export default NotesSidebar;