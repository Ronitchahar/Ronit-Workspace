function NoteCard({ note, selectedNote, setSelectedNote, togglePin, deleteNote }) {
  const isSelected = selectedNote?.id === note.id;
  const isPinned = note.pinned;

  return (
    <div
      className={`note-item ${isPinned ? "pinned-note" : ""} ${
        isSelected ? "active-note" : ""
      }`}
      onClick={() => setSelectedNote(note)}
    >
      <div className="note-item-main">
        <span>{note.title}</span>
        <small>
          {note.updatedAt
            ? new Date(note.updatedAt).toLocaleString()
            : "No updates yet"}
        </small>
      </div>

      <div className="note-item-actions">
        <button
          className={`note-pin ${isPinned ? "active-pin" : ""}`}
          aria-label={isPinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.id);
          }}
        >
          📌
        </button>

        <button
          className="note-delete"
          aria-label={`Delete ${note.title}`}
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

export default NoteCard;
