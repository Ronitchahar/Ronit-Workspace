import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FileUploadButton from "./FileUploadButton";
// import MobileCameraButton from "./MobileCameraButton";
import ModernSendButton from "./ModernSendButton";
import FilePreview from "./FilePreview";
import { useToast } from "../../context/ToastContext";
import "./ChatInputEnhancements.css";

function InputBar({ sendMessage }) {
  const { addToast } = useToast();
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Handle errors gracefully (memoized to prevent dependency array changes)
  const handleUploadError = useCallback((message) => {
    console.error("Upload error:", message);
    addToast(message, "error");
  }, [addToast]);

  const handleCameraError = useCallback((message) => {
    console.error("Camera error:", message);
    addToast(message, "error");
  }, [addToast]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        120
      ) + "px";
    }
  }, [input]);

  const handleFileUpload = (file) => {
    setSelectedFile({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  };

  const handlePhotoCapture = (file) => {
    setSelectedFile({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    if (!input.trim() && !selectedFile) return;

    // ====================================================
    // CRITICAL: PASS ACTUAL FILE BLOB, NOT JUST METADATA
    // ====================================================
    const messageData = {
      text: input.trim(),
      file: selectedFile
        ? {
            file: selectedFile.file,        // ✅ ACTUAL BLOB
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
          }
        : null,
    };

    // DEBUG: Log what we're sending
    console.log('📨 InputBar sending message:');
    console.log('  Text:', messageData.text ? messageData.text.substring(0, 50) : '(empty)');
    console.log('  File attached:', !!messageData.file);
    if (messageData.file) {
      console.log('    - Name:', messageData.file.name);
      console.log('    - Type:', messageData.file.type);
      console.log('    - Size:', messageData.file.size);
      console.log('    - Blob exists:', messageData.file.file instanceof Blob);
    }

    // Send message to parent component
    sendMessage(messageData);

    // ========================================================
    // CRITICAL: AGGRESSIVE STATE CLEANUP
    // Prevents stale file state from affecting future sends
    // ========================================================
    console.log('🧹 Cleaning up file state...');
    
    // Clear input text
    setInput("");
    
    // Clear selected file IMMEDIATELY
    setSelectedFile(null);
    
    // Clear file input ref IMMEDIATELY
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    console.log('✅ File state cleaned successfully');
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  return (
    <div className="input-bar-container">
      {/* File Preview */}
      <AnimatePresence>
        {selectedFile && (
          <FilePreview
            file={selectedFile}
            onRemove={handleRemoveFile}
          />
        )}
      </AnimatePresence>

      {/* Main Input Bar */}
      <div className="input-bar">
        {/* Action Buttons Container */}
        <div className="chat-actions-container">
          {/* Upload Button */}
          <FileUploadButton
            onFileSelected={handleFileUpload}
            disabled={false}
            onError={handleUploadError}
          />

          {/* Mobile Camera Button (only on mobile/tablet) */}
          {/* <MobileCameraButton
            onPhotoCapture={handlePhotoCapture}
            disabled={false}
            onError={handleCameraError}
          /> */}
        </div>

        {/* Input Wrapper */}
        <div className="input-wrapper">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="input-bar input"
            placeholder="Message Ronit... (Shift + Enter for new line)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows="1"
            style={{
              maxHeight: "120px",
              overflow: "auto",
              resize: "none",
              lineHeight: "1.5",
            }}
            aria-label="Message input"
          />

          {/* Character Counter */}
          {input.length > 0 && (
            <div className="input-counter">{input.length} characters</div>
          )}
        </div>

        {/* Modern Send Button */}
        <ModernSendButton
          onClick={handleSend}
          disabled={!input.trim() && !selectedFile}
        />
      </div>
    </div>
  );
}

export default InputBar;