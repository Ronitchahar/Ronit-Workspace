import NoteCard from "./NoteCard";

function NotesList({ notes, selectedNote, setSelectedNote, togglePin, deleteNote }) {
  if (notes.length === 0) {
    return (
      <div className="empty-notes-state">
        <p>No notes found.</p>
      </div>
    );
  }

  return (
    <div className="notes-list">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          togglePin={togglePin}
          deleteNote={deleteNote}
        />
      ))}
    </div>
  );
}

export default NotesList;
