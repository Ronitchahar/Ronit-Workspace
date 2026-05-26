function FileCard({ file, deleteFile }) {
  const getFileIcon = (name) => {
    if (!name) return "📄";
    if (name.match(/\.(pdf)$/i)) return "📕";
    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return "🖼️";
    if (name.match(/\.(js|jsx|ts|tsx|css|html|json)$/i)) return "💻";
    if (name.match(/\.(zip|rar|tar|gz)$/i)) return "📦";
    if (name.match(/\.(mp4|mov|avi)$/i)) return "🎬";
    if (name.match(/\.(mp3|wav)$/i)) return "🎵";
    return "📄";
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isImage = file.name?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
  const canOpen = Boolean(file.url);

  return (
    <article className="files-file-card fade-in-up">
      <div className="files-file-card-thumb">
        {isImage && file.url ? (
          <img src={file.url} alt={file.name} loading="lazy" />
        ) : (
          <span className="files-file-card-thumb-icon" aria-hidden="true">
            {getFileIcon(file.name)}
          </span>
        )}

        <div className="files-file-card-overlay">
          {canOpen && (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="files-file-overlay-btn"
              title="Preview"
              aria-label={`Preview ${file.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span aria-hidden="true">👁</span>
              <span className="files-overlay-label">Preview</span>
            </a>
          )}
          {canOpen && (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              download={file.name}
              className="files-file-overlay-btn"
              title="Download"
              aria-label={`Download ${file.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span aria-hidden="true">⬇</span>
              <span className="files-overlay-label">Download</span>
            </a>
          )}
          <button
            type="button"
            className="files-file-overlay-btn delete-btn"
            onClick={() => deleteFile(file.id)}
            title="Delete"
            aria-label={`Delete ${file.name}`}
          >
            <span aria-hidden="true">🗑</span>
            <span className="files-overlay-label">Delete</span>
          </button>
        </div>
      </div>

      <div className="files-file-card-body">
        <h3 title={file.name}>{file.name}</h3>
        <div className="files-file-card-meta">
          <span className="files-meta-size">{formatSize(file.size)}</span>
          <span className="files-meta-date">{formatDate(file.created_at)}</span>
        </div>
      </div>

      <div className="files-file-card-actions files-file-card-actions--mobile">
        {canOpen && (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="files-file-action-btn"
            title="Open / download"
            onClick={(e) => e.stopPropagation()}
          >
            ⬇️
          </a>
        )}
        <button
          type="button"
          className="files-file-action-btn delete-btn"
          onClick={() => deleteFile(file.id)}
          title="Delete file"
          aria-label={`Delete ${file.name}`}
        >
          🗑
        </button>
      </div>
    </article>
  );
}

export default FileCard;
