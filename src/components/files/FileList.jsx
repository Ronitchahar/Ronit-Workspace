import FileCard from "./FileCard";

function FileList({ files, deleteFile }) {
  if (files.length === 0) {
    return (
      <div className="files-empty-state fade-in-up">
        <div className="files-empty-icon" aria-hidden="true">
          📂
        </div>
        <p>No files yet. Upload above to get started.</p>
      </div>
    );
  }

  return (
    <div className="files-card-grid">
      {files.map((file) => (
        <FileCard
          key={file.id || file.name}
          file={file}
          deleteFile={deleteFile}
        />
      ))}
    </div>
  );
}

export default FileList;
