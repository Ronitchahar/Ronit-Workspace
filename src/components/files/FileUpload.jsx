import { useRef, useState } from "react";

function FileUpload({ handleFiles }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const onFilesSelected = (fileList) => {
    if (fileList?.length > 0) {
      handleFiles(fileList);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    onFilesSelected(e.dataTransfer.files);
  };

  return (
    <div
      className={`files-upload-zone${isDragging ? " is-dragging" : ""}`}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      aria-label="Upload files"
    >
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => onFilesSelected(e.target.files)}
        style={{ display: "none" }}
      />
      <div className="files-upload-icon" aria-hidden="true">
        ⚡
      </div>
      <h3 className="files-upload-title">
        {isDragging ? "Drop files here" : "Upload files"}
      </h3>
      <p className="files-upload-subtitle">Click or drag & drop</p>
    </div>
  );
}

export default FileUpload;
