import { X, File, Image as ImageIcon, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

/**
 * FilePreview - Shows file preview with remove option
 * Supports: images, documents, PDFs
 * Safe: Handles invalid files gracefully
 */
function FilePreview({ file, onRemove }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    // Validate file is actually a File or Blob
    try {
      if (typeof file !== "object" || file === null) {
        console.warn("Invalid file object:", file);
        setError(true);
        return;
      }
      
      // Safe instanceof check with fallback
      const isFileOrBlob = 
        (typeof File !== "undefined" && file instanceof File) ||
        (typeof Blob !== "undefined" && file instanceof Blob) ||
        (file && typeof file === "object" && (file.type !== undefined || file.size !== undefined));
      
      if (!isFileOrBlob) {
        console.warn("Object is not a valid File or Blob:", file);
        setError(true);
        return;
      }
    } catch (err) {
      console.warn("Error validating file object:", err);
      setError(true);
      return;
    }

    // Only create URL for images
    const isImage = file.type?.startsWith("image/");
    if (!isImage) {
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setError(false);

      // Cleanup: revoke URL when component unmounts or file changes
      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    } catch (err) {
      console.error("Failed to create image preview:", err);
      setError(true);
      setImageUrl(null);
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.type?.startsWith("image/");
  const isPDF = file.type === "application/pdf";

  const getFileIcon = () => {
    if (isImage) return <ImageIcon size={16} />;
    if (isPDF) return <FileText size={16} />;
    return <File size={16} />;
  };

  const getImagePreview = () => {
    if (!isImage || !imageUrl || error) return null;

    return (
      <img
        src={imageUrl}
        alt="Preview"
        className="file-preview-image"
        onError={() => {
          console.error("Image preview failed to load");
          setError(true);
        }}
      />
    );
  };

  return (
    <motion.div
      className="file-preview-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="file-preview-content">
        {isImage && !error ? (
          getImagePreview()
        ) : (
          <div className="file-preview-icon">{getFileIcon()}</div>
        )}
        <div className="file-preview-info">
          <span className="file-preview-name">
            {file.name || "Unnamed file"}
          </span>
          <span className="file-preview-size">
            {file.size ? (file.size / 1024).toFixed(2) : "0"} KB
          </span>
        </div>
      </div>
      <motion.button
        onClick={onRemove}
        className="file-preview-remove"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Remove file"
        aria-label="Remove file"
      >
        <X size={16} />
      </motion.button>
    </motion.div>
  );
}

export default FilePreview;
