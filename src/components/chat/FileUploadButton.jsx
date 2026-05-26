import { useRef } from "react";
import { Upload } from "lucide-react";
import "./FileUploadButton.css";

/**
 * FileUploadButton - Click-based file upload
 * Supports: images, PDFs, documents
 * Safe: Handles invalid files and errors gracefully
 */
function FileUploadButton({ onFileSelected, disabled = false, onError = null }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!isValidFile(file)) {
        handleError("Unsupported file type. Try images, PDFs, or documents.");
        return;
      }

      onFileSelected(file);
    } catch (err) {
      console.error("File select error:", err);
      handleError("Failed to process selected file");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isValidFile = (file) => {
    // Validate file is actually a File
    if (!(file instanceof File)) {
      console.warn("Invalid file object:", file);
      return false;
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!file.type || !validTypes.includes(file.type)) {
      console.warn("Invalid file type:", file.type);
      return false;
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      handleError("File too large. Maximum size: 25MB");
      return false;
    }

    return true;
  };

  const handleError = (message) => {
    console.error("FileUploadButton:", message);
    if (onError) {
      onError(message);
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="chat-action-btn upload-btn"
        title="Upload file (image, PDF, document)"
        aria-label="Upload file"
        style={{
          opacity: disabled ? 0.5 : 1,
          background: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Upload size={18} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        aria-label="File input"
      />
    </>
  );
}

export default FileUploadButton;
