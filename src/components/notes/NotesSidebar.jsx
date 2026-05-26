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
}) {
  return (
    <div className="notes-sidebar">
      <div className="notes-header">
        <div>
          <h2>Notes</h2>
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