import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { getCurrentUser } from "../services/authService";

import NotesSidebar from "../components/notes/NotesSidebar";
import NoteEditor from "../components/notes/NoteEditor";

import {
  getNotes,
  addNote as addNoteToDB,
  deleteNote as deleteNoteFromDB,
  updateNote as updateNoteInDB,
} from "../services/notesService";

function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobileViewingNote, setIsMobileViewingNote] = useState(false); // Mobile state: list vs editor
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedNoteIdRef = useRef(selectedNoteId);
  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId;
  }, [selectedNoteId]);

  const debounceTimerRef = useRef(null);
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Detect mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // When note is selected on mobile, show editor
  useEffect(() => {
    if (isMobile && selectedNoteId) {
      setIsMobileViewingNote(true);
    }
  }, [selectedNoteId, isMobile]);
  
    // LOAD NOTES ONLY ONCE
    useEffect(() => {
      let mounted = true;
  
      async function init() {
        try {
          const user = await getCurrentUser();
          if (!user?.id) return;
          
          const dbNotes = await getNotes();
          if (!mounted) return;
  
          if (dbNotes && dbNotes.length > 0) {
            const formatted = dbNotes.map((note) => ({
              ...note,
              pinned: note.pinned || false,
              updatedAt: note.updated_at || note.created_at,
            }));
  
            setNotes(formatted);
            setSelectedNoteId(formatted[0]?.id);
          } else {
            // fallback: create a welcome note in DB (only once per user)
            const hasSeenWelcome = localStorage.getItem(`welcome_note_created_${user.id}`);
            if (!hasSeenWelcome) {
              localStorage.setItem(`welcome_note_created_${user.id}`, "true");
              
              try {
                const welcomeContent = `# 👋 Welcome to Ronit Notes\n\nYour smart workspace for writing, organizing, and thinking faster.\n\n### ✨ Features\n\n* 📝 Rich Notes Editor\n* 👁 Live Preview Mode\n* 🎨 Text Colors & Highlights\n* 🔠 Font Size Controls\n* 🤖 Send Selected Text to AI\n* ⚡ Autosave\n* 📌 Quick Symbols\n* 📂 Cloud Synced Notes\n* 🌙 Futuristic Dark Workspace\n\n### 🚀 Tips\n\n* Select text to open quick tools\n* Use Preview for clean reading mode\n* Send important notes directly to AI\n* Your notes save automatically\n\nStart writing and organize your ideas smarter.`;
                
                const welcome = await addNoteToDB("👋 Welcome to Ronit Notes", welcomeContent);
  
                if (welcome) {
                  const formatted = {
                    ...welcome,
                    pinned: false,
                    updatedAt: welcome.created_at,
                  };
                  setNotes([formatted]);
                  setSelectedNoteId(formatted.id);
                }
              } catch (err) {
                console.error("Welcome note creation failed:", err);
              }
            }
          }
        } catch (error) {
          console.error("Init notes failed:", error);
        } finally {
          if (mounted) setLoading(false);
        }
      }
  
      init();
  
      // setup realtime listener for notes for this user
      (async () => {
        const user = await getCurrentUser();
        if (!user?.id) return;
  
        const channel = supabase.channel(`notes:user=${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` },
            (payload) => {
              const ev = payload.eventType;
              const record = payload.new || payload.old;
              if (!record) return;
  
              setNotes((prev) => {
                if (ev === 'INSERT') {
                  const inserted = { ...record, pinned: record.pinned || false, updatedAt: record.updated_at || record.created_at };
                    const exists = prev.find((p) => p.id === inserted.id);
                    if (exists) return prev;
                    return [inserted, ...prev];
                  }
    
                  if (ev === 'UPDATE') {
                    return prev.map((p) => (p.id === record.id ? { ...p, ...record, updatedAt: record.updated_at || p.updatedAt } : p));
                  }
    
                  if (ev === 'DELETE') {
                    return prev.filter((p) => p.id !== record.id);
                  }
    
                  return prev;
                });
              }
            )
            .subscribe();
    
          return () => {
            try { supabase.removeChannel(channel); } catch (e) {}
          };
        })();
    
        return () => {
          mounted = false;
        };
    
      }, []);
    
      // ADD NOTE (Optimistic UI -> Background Sync)
      async function addNote() {
        console.log("[NOTES-PAGE] ADD NOTE button clicked: creating optimistic note");
        const now = new Date().toISOString();
        const tempId = Date.now();
    
        const optimisticNote = {
          id: tempId,
          title: "Untitled Note",
          content: "",
          pinned: false,
          createdAt: now,
          updatedAt: now,
          isLocal: true, // Mark as local so debounced autosave can properly 'create' it
        };
    
        // 1. Instantly update UI with temp note
        console.log("[NOTES-PAGE] Adding optimistic note with tempId:", tempId);
        setNotes((prev) => [optimisticNote, ...prev]);
        setSelectedNoteId(tempId);
    
        // 2. Background sync to Supabase without blocking UI
        try {
          console.log("[NOTES-PAGE] Starting background sync of tempId:", tempId, "to Supabase");
          const newNote = await addNoteToDB("Untitled Note", "");
    
          if (newNote && newNote.id) {
            console.log("[NOTES-PAGE] Background sync SUCCESS! Got real DB ID:", newNote.id, "for tempId:", tempId);
            const formatted = {
              ...newNote,
              pinned: false,
              updatedAt: newNote.updated_at || newNote.created_at,
            };
    
            // Replace temp note with real DB note
            setNotes((prev) => {
              const updated = prev.map((n) => {
                if (n.id === tempId) {
                  console.log("[NOTES-PAGE] ID SWAP: tempId", tempId, "→ real DB ID", formatted.id);
                  return formatted;
                }
                return n;
              });
              return updated;
            });
            
            // Update selected ID to real DB ID
            setSelectedNoteId(formatted.id);
            console.log("[NOTES-PAGE] selectedNoteId updated to real DB ID:", formatted.id);
          } else {
            console.warn("[NOTES-PAGE] Background sync returned null/invalid data for tempId:", tempId);
          }
        } catch (e) {
          console.error("[NOTES-PAGE] Background sync FAILED for tempId:", tempId, "Error:", e);
          // We leave it as isLocal: true. 
          // When they edit it, the debounced updateNote will see isLocal=true and attempt addNoteToDB again.
        }
      }
    
      // DELETE NOTE
      async function deleteNote(id) {
        console.log("[NOTES-PAGE] DELETE NOTE called for ID:", id);
        
        // if record is local-only, just remove
        const note = notes.find((n) => n.id === id);
        if (note?.isLocal) {
          console.log("[NOTES-PAGE] Deleting local-only note:", id);
          const updated = notes.filter((n) => n.id !== id);
          setNotes(updated);
          if (selectedNoteId === id) setSelectedNoteId(updated[0]?.id || null);
          return;
        }
    
        console.log("[NOTES-PAGE] Deleting DB note:", id);
        await deleteNoteFromDB(id);
    
        const updated = notes.filter((note) => note.id !== id);
        setNotes(updated);
    
        if (selectedNoteId === id) {
          console.log("[NOTES-PAGE] Deleted note was selected, switching to next note");
          setSelectedNoteId(updated[0]?.id || null);
        }
      }
    
      // UPDATE NOTE (persist if saved)
      function updateNote(updates) {
        // update local state immediately using the closure's selectedNoteId to guarantee immediate UI update
        const idToUpdate = selectedNoteId;
        console.log("[NOTES-PAGE] updateNote() called with selectedNoteId:", idToUpdate, "updates:", Object.keys(updates));
        
        setNotes((prev) => prev.map((note) => {
          if (note.id === idToUpdate) {
            return {
              ...note,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }
          return note;
        }));
    
        // debounce cloud save (1000ms idle = 1 second after last edit)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          console.log("[NOTES-PAGE] Debounce timer cleared, restarting for selectedNoteId:", idToUpdate);
        }
        
        debounceTimerRef.current = setTimeout(async () => {
          console.log("[NOTES-PAGE] DEBOUNCE FIRED after 1000ms idle");
          
          // fetch the LATEST selected note ID to avoid stale closures if tempId swapped to dbId
          const latestId = selectedNoteIdRef.current;
          console.log("[NOTES-PAGE] Debounce: latestId from ref:", latestId);
          
          const currentNote = notesRef.current.find((n) => n.id === latestId) || null;
          
          if (!currentNote) {
            console.warn("[NOTES-PAGE] DEBOUNCE ABORTED: note not found in notes array for ID:", latestId);
            return;
          }
          
          console.log("[NOTES-PAGE] Debounce: found note with ID:", currentNote.id, "isLocal:", currentNote.isLocal, "title:", currentNote.title);
    
          // if local-only, create in DB
          if (currentNote.isLocal) {
            console.log("[NOTES-PAGE] DEBOUNCE: Note is local (isLocal=true), attempting DB insert for ID:", currentNote.id);
            try {
              const created = await addNoteToDB(currentNote.title || "Untitled Note", currentNote.content || "");
              if (created && created.id) {
                console.log("[NOTES-PAGE] DEBOUNCE: Local note insert SUCCESS! Got real DB ID:", created.id, "for tempId:", currentNote.id);
                const persisted = {
                  ...created,
                  pinned: created.pinned || false,
                  updatedAt: created.updated_at,
                };
                setNotes((prev) => {
                  const updated = prev.map((n) => {
                    if (n.id === currentNote.id) {
                      console.log("[NOTES-PAGE] DEBOUNCE: ID SWAP in debounce: tempId", currentNote.id, "→ real DB ID", persisted.id);
                      return persisted;
                    }
                    return n;
                  });
                  return updated;
                });
                setSelectedNoteId(persisted.id);
                console.log("[NOTES-PAGE] DEBOUNCE: selectedNoteId updated to real DB ID:", persisted.id);
              } else {
                console.warn("[NOTES-PAGE] DEBOUNCE: Local note insert returned null/invalid data");
              }
            } catch (e) {
              console.error("[NOTES-PAGE] DEBOUNCE: Local note insert FAILED:", e);
            }
            return;
          }
    
          // otherwise update existing DB note
          console.log("[NOTES-PAGE] DEBOUNCE: Updating existing DB note with ID:", latestId);
          try {
            await updateNoteInDB(latestId, {
              title: currentNote.title,
              content: currentNote.content,
            });
            console.log("[NOTES-PAGE] DEBOUNCE: Update to DB note successful!");
          } catch (e) {
            console.error("[NOTES-PAGE] DEBOUNCE: Update to DB note FAILED:", e);
          }
        }, 1000); // 1000ms idle as requested
      }
    // PIN NOTE
    function togglePin(id) {
      console.log("[NOTES-PAGE] togglePin called for ID:", id);
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id === id) {
            return {
              ...note,
              pinned: !note.pinned,
              updatedAt: new Date().toISOString(),
            };
          }
          return note;
        })
      );
  
      // persist pin if saved
      (async () => {
        const note = notes.find((n) => n.id === id);
        if (!note) {
          console.warn("[NOTES-PAGE] togglePin: note not found for ID:", id);
          return;
        }
        if (note.isLocal) {
          console.log("[NOTES-PAGE] togglePin: skipping local note (ID:", id, ")");
          return;
        }
        console.log("[NOTES-PAGE] togglePin: updating pin status for DB note ID:", id);
        await updateNoteInDB(id, { pinned: !note.pinned });
      })();
    }

  // FILTER AND SORT NOTES
  const filteredNotes =
    useMemo(() => {
      const filtered = notes.filter(
        (note) =>
          note.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          note.content
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );

      return [...filtered].sort((a, b) => {
        // Group pinned notes at the top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Within pinned and unpinned groups, sort chronologically by updatedAt desc
        const timeA = new Date(a.updatedAt || a.updated_at || 0).getTime();
        const timeB = new Date(b.updatedAt || b.updated_at || 0).getTime();
        return timeB - timeA;
      });
    }, [
      notes,
      searchQuery,
    ]);

  // SELECTED NOTE
  const selectedNote =
    notes.find(
      (note) =>
        note.id ===
        selectedNoteId
    );

  // LOADING SCREEN
  if (loading) {
    return (
      <div style={{ color: "white", padding: "40px" }}>
        Loading Notes...
      </div>
    );
  }

  // MOBILE: Show editor fullscreen when viewing note
  if (isMobile && isMobileViewingNote && selectedNote) {
    return (
      <div className="notes-page notes-page-mobile-editor">
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "60px",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          backgroundColor: "rgba(10, 15, 30, 0.5)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}>
          <button
            onClick={() => setIsMobileViewingNote(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginRight: "auto",
            }}
          >
            ← Back
          </button>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", flex: 1 }}>
            {selectedNote?.title || "Note"}
          </h3>
        </div>
        <div style={{ paddingTop: "60px", height: "100%", overflow: "hidden" }}>
          <NoteEditor
            selectedNote={selectedNote}
            updateNote={updateNote}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </div>
      </div>
    );
  }

  // MOBILE: Show list fullscreen
  // DESKTOP: Show both sidebar and editor
  return (
    <div className="notes-page" style={isMobile && !isMobileViewingNote ? { overflow: "hidden" } : {}}>
      {(!isMobile || !isMobileViewingNote) && (
        <NotesSidebar
          notes={filteredNotes}
          selectedNote={selectedNote}
          setSelectedNote={(note) => setSelectedNoteId(note.id)}
          addNote={addNote}
          deleteNote={deleteNote}
          togglePin={togglePin}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}

      {!isMobile && (
        <NoteEditor
          selectedNote={selectedNote}
          updateNote={updateNote}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
      )}
    </div>
  );
}

export default NotesPage;