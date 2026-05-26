import { useRef, useState, useEffect } from "react";
import SymbolKeyboard from "../keyboard/SymbolKeyboard";
import Modal from "../common/Modal";
import { downloadNoteAsPDF } from "../../services/exportService";
import { useAppContext } from "../../context/AppContext";
import { Copy, ClipboardPaste, Bold, Italic, Underline, Sparkles, Palette, Type as TypeIcon, ChevronDown, Keyboard } from 'lucide-react';

/**
 * Editor Modes:
 * 0 = EDIT MODE (default) - editor visible, preview hidden
 * 1 = SPLIT PREVIEW - editor + live preview side-by-side (DESKTOP ONLY)
 * 2 = FULLSCREEN PREVIEW - full-page formatted preview only
 * On mobile: 0 → 2 → 0 (skips split mode)
 * On desktop: 0 → 1 → 2 → 0
 */
function NoteEditor({
  selectedNote,
  updateNote,
}) {
  const { setPendingAIText } = useAppContext();
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [editorMode, setEditorMode] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, text: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const [fontSize, setFontSize] = useState("normal");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [fontSizePickerOpen, setFontSizePickerOpen] = useState(false);
  const editorRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync external content changes (like switching notes) to the contentEditable div
  useEffect(() => {
    if (editorRef.current && selectedNote) {
      if (editorRef.current.innerHTML !== selectedNote.content) {
        editorRef.current.innerHTML = selectedNote.content || "";
      }
    }
  }, [selectedNote?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Allow clicking inside the menu
      if (contextMenu.show && !e.target.closest('.floating-context-menu')) {
        setContextMenu(prev => ({ ...prev, show: false }));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu.show]);

  const handlePreviewToggle = () => {
    if (isMobile) {
      // Mobile: cycle 0 → 2 → 0 (skip split mode)
      setEditorMode((prev) => prev === 0 ? 2 : 0);
    } else {
      // Desktop: cycle 0 → 1 → 2 → 0
      setEditorMode((prev) => (prev + 1) % 3);
    }
  };

  const handleSelect = (e) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (contextMenu.show) setContextMenu(prev => ({ ...prev, show: false }));
      return;
    }

    const text = selection.toString();
    
    if (text && text.trim().length > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      let x = e.clientX || rect.left + rect.width / 2;
      let y = e.clientY || rect.top;
      
      if (x + 300 > window.innerWidth) x = window.innerWidth - 300;
      if (y - 50 < 0) y = 50;
      
      setContextMenu({ show: true, x, y: y - 10, text });
    } else {
      if (contextMenu.show) setContextMenu(prev => ({ ...prev, show: false }));
    }
  };

  const handleAction = (action) => {
    const { text } = contextMenu;
    const editor = editorRef.current;
    if (!editor || !selectedNote) return;

    editor.focus();

    switch (action) {
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        navigator.clipboard.readText().then(clipText => {
          document.execCommand('insertText', false, clipText);
        });
        break;
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      case 'ai':
        setPendingAIText(text);
        window.dispatchEvent(new Event("NAVIGATE_TO_CHAT"));
        break;
    }

    setContextMenu(prev => ({ ...prev, show: false }));
    updateNote({ content: editor.innerHTML });
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  const applyColor = (color, isBackground = false) => {
    setColorPickerOpen(false);
    const editor = editorRef.current;
    if (!editor || !selectedNote) return;

    editor.focus();

    if (color === "off") {
      document.execCommand('removeFormat', false, null);
    } else {
      if (isBackground) {
        document.execCommand('hiliteColor', false, color);
      } else {
        document.execCommand('foreColor', false, color);
      }
    }
    
    updateNote({ content: editor.innerHTML });
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  const insertSymbol = (symbol) => {
    const editor = editorRef.current;
    if (!editor || !selectedNote) return;

    editor.focus();
    document.execCommand('insertText', false, symbol);

    updateNote({ content: editor.innerHTML });
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  const parseMarkdown = (text) => {
    if (!text) return "";

    // We do NOT escape HTML here because the editor natively outputs HTML tags for formatting
    let html = text
      .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`)
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/==(.*?)==/g, "<span class='highlight'>$1</span>")
      .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' rel='noreferrer'>$1</a>")
      .replace(/^\- (.*)$/gm, "<li>$1</li>");

    return `<div class="parsed-markdown">${html}</div>`;
  };

  const formattedUpdatedAt = selectedNote?.updatedAt
    ? new Date(selectedNote.updatedAt).toLocaleString()
    : "";

  return (
    <div className="note-editor">
      {selectedNote ? (
        <>
          <div className="note-editor-header">
            <input
              className="note-title-input"
              value={selectedNote.title}
              onChange={(e) => updateNote({ title: e.target.value })}
              placeholder="Note title"
            />

            <div className="note-editor-actions">
              <div className="note-actions-group">
                <button
                  type="button"
                  className="editor-action-button"
                  onClick={() => setSymbolPickerOpen((open) => !open)}
                  title="Symbols"
                >
                  <Keyboard size={16} />
                </button>

                <div className="dropdown-container">
                  <button
                    type="button"
                    className={`editor-action-button ${fontSizePickerOpen ? "active" : ""}`}
                    onClick={() => {
                      setFontSizePickerOpen(!fontSizePickerOpen);
                      setColorPickerOpen(false);
                    }}
                    title="Font Size"
                  >
                    <TypeIcon size={16} /> <ChevronDown size={14} />
                  </button>
                  {fontSizePickerOpen && (
                    <div className="dropdown-menu fade-in-up">
                      <button onClick={() => { setFontSize("small"); setFontSizePickerOpen(false); }}>Small</button>
                      <button onClick={() => { setFontSize("normal"); setFontSizePickerOpen(false); }}>Normal</button>
                      <button onClick={() => { setFontSize("large"); setFontSizePickerOpen(false); }}>Large</button>
                      <button onClick={() => { setFontSize("xlarge"); setFontSizePickerOpen(false); }}>Extra Large</button>
                    </div>
                  )}
                </div>

                <div className="dropdown-container">
                  <button
                    type="button"
                    className={`editor-action-button ${colorPickerOpen ? "active" : ""}`}
                    onClick={() => {
                      setColorPickerOpen(!colorPickerOpen);
                      setFontSizePickerOpen(false);
                    }}
                    title="Text Color & Highlights"
                  >
                    <Palette size={16} /> <ChevronDown size={14} />
                  </button>
                  {colorPickerOpen && (
                    <div className="dropdown-menu color-picker-menu fade-in-up">
                      <div className="color-section-label">Text Colors</div>
                      <div className="color-grid">
                        <button className="color-swatch" style={{ background: '#ef4444' }} onClick={() => applyColor('#ef4444')} title="Red"></button>
                        <button className="color-swatch" style={{ background: '#f97316' }} onClick={() => applyColor('#f97316')} title="Orange"></button>
                        <button className="color-swatch" style={{ background: '#eab308' }} onClick={() => applyColor('#eab308')} title="Yellow"></button>
                        <button className="color-swatch" style={{ background: '#22c55e' }} onClick={() => applyColor('#22c55e')} title="Green"></button>
                        <button className="color-swatch" style={{ background: '#3b82f6' }} onClick={() => applyColor('#3b82f6')} title="Blue"></button>
                        <button className="color-swatch" style={{ background: '#a855f7' }} onClick={() => applyColor('#a855f7')} title="Purple"></button>
                        <button className="color-swatch" style={{ background: '#ec4899' }} onClick={() => applyColor('#ec4899')} title="Pink"></button>
                        <button className="color-swatch" style={{ background: '#ffffff' }} onClick={() => applyColor('#ffffff')} title="White"></button>
                        <button className="color-swatch" style={{ background: '#6ee7b7' }} onClick={() => applyColor('#6ee7b7')} title="Mint"></button>
                        <button className="color-swatch" style={{ background: '#93c5fd' }} onClick={() => applyColor('#93c5fd')} title="Light Blue"></button>
                        <button className="color-swatch" style={{ background: '#fbcfe8' }} onClick={() => applyColor('#fbcfe8')} title="Light Pink"></button>
                        <button className="color-swatch" style={{ background: '#9ca3af' }} onClick={() => applyColor('#9ca3af')} title="Gray"></button>
                      </div>
                      
                      <div className="menu-divider-horizontal"></div>
                      <div className="color-section-label">Background Highlights</div>
                      <div className="color-grid">
                        <button className="color-swatch" style={{ background: 'rgba(239, 68, 68, 0.4)' }} onClick={() => applyColor('rgba(239, 68, 68, 0.4)', true)} title="Red Highlight"></button>
                        <button className="color-swatch" style={{ background: 'rgba(234, 179, 8, 0.4)' }} onClick={() => applyColor('rgba(234, 179, 8, 0.4)', true)} title="Yellow Highlight"></button>
                        <button className="color-swatch" style={{ background: 'rgba(34, 197, 94, 0.4)' }} onClick={() => applyColor('rgba(34, 197, 94, 0.4)', true)} title="Green Highlight"></button>
                        <button className="color-swatch" style={{ background: 'rgba(59, 130, 246, 0.4)' }} onClick={() => applyColor('rgba(59, 130, 246, 0.4)', true)} title="Blue Highlight"></button>
                      </div>

                      <div className="menu-divider-horizontal"></div>
                      <button className="color-off-btn" onClick={() => applyColor('off')}>Turn Formatting Off</button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`editor-action-button ${editorMode !== 0 ? "active" : ""}`}
                  onClick={handlePreviewToggle}
                  title={isMobile ? "Toggle Preview" : "Cycle through: Edit → Preview → Read-Only"}
                >
                  👁
                </button>
                <button
                  type="button"
                  className="editor-action-button"
                  onClick={() => {
                    setDownloadFileName(selectedNote.title || "Untitled Note");
                    setShowShareModal(true);
                  }}
                  title="Share"
                >
                  📤
                </button>
              </div>
              <div className="note-editor-meta">
                {isSaving && <span className="autosave-indicator">Saving...</span>}
              </div>
            </div>
          </div>

          {symbolPickerOpen && <SymbolKeyboard onInsert={insertSymbol} />}

          <div className={`note-editor-body editor-mode-${editorMode} font-size-${fontSize}`}>
            {editorMode !== 2 && (
              <div className="editor-pane">
                <div
                  ref={editorRef}
                  className="editable-div"
                  contentEditable={editorMode !== 2}
                  onInput={(e) => {
                    updateNote({ content: e.currentTarget.innerHTML });
                    setIsSaving(true);
                    setTimeout(() => setIsSaving(false), 800);
                  }}
                  onMouseUp={handleSelect}
                  onKeyUp={handleSelect}
                  data-placeholder="Write your thoughts..."
                />
                {contextMenu.show && (
                  <div 
                    className="floating-context-menu fade-in-up" 
                    style={{
                      position: 'fixed',
                      top: contextMenu.y,
                      left: contextMenu.x,
                      zIndex: 1000
                    }}
                  >
                    <button onClick={() => handleAction('copy')} title="Copy"><Copy size={16} /></button>
                    <button onClick={() => handleAction('paste')} title="Paste"><ClipboardPaste size={16} /></button>
                    <div className="menu-divider"></div>
                    <button onClick={() => handleAction('bold')} title="Bold"><Bold size={16} /></button>
                    <button onClick={() => handleAction('italic')} title="Italic"><Italic size={16} /></button>
                    <button onClick={() => handleAction('underline')} title="Underline"><Underline size={16} /></button>
                    <div className="menu-divider"></div>
                    <button onClick={() => handleAction('ai')} className="send-to-ai-btn" title="Send to AI">
                      <Sparkles size={16} /> AI
                    </button>
                  </div>
                )}
              </div>
            )}

            {editorMode === 1 && (
              <div className="preview-pane split-mode">
                <div className="note-preview-label">Preview</div>
                <div
                  className="note-preview-content"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(selectedNote.content),
                  }}
                />
              </div>
            )}

            {editorMode === 2 && (
              <div className="preview-pane fullscreen-mode">
                <div className="fullscreen-preview-container">
                  <div
                    className="note-preview-content fullscreen"
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(selectedNote.content),
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <Modal
            isOpen={showShareModal}
            title="Download Note"
            onConfirm={() => {
              downloadNoteAsPDF(selectedNote, downloadFileName || "Untitled Note");
              setShowShareModal(false);
            }}
            onCancel={() => setShowShareModal(false)}
            confirmText="Download"
            cancelText="Cancel"
          >
            <p>Download this note as a beautifully formatted document?</p>
            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#cbd5e1", fontSize: "14px", fontWeight: "500" }}>
                Filename:
              </label>
              <input
                type="text"
                value={downloadFileName}
                onChange={(e) => setDownloadFileName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.target.style.background = "rgba(99, 102, 241, 0.1)";
                  e.target.style.borderColor = "rgba(99, 102, 241, 0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.2)";
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                }}
                placeholder="Enter filename"
              />
              <p style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                File will be saved as: <strong>{downloadFileName || "Untitled Note"}.html</strong>
              </p>
            </div>
          </Modal>
        </>
      ) : (
        <div className="note-empty">
          Select a note or create one to begin writing.
        </div>
      )}
    </div>
  );
}

export default NoteEditor;