import { useState, useEffect } from "react";
import FileUpload from "../components/files/FileUpload";
import FileList from "../components/files/FileList";
import { getFiles, uploadFile, deleteFileService } from "../services/filesService";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import Skeleton from "../components/layout/Skeleton";
import "./FilesPage.css";

function FilesPage() {
  const { user } = useAppContext();
  const { addToast } = useToast();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchFiles() {
      if (user) {
        const dbFiles = await getFiles(user.id);
        if (mounted && dbFiles) {
          setFiles(dbFiles);
        }
      }
      if (mounted) setLoading(false);
    }
    fetchFiles();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleFiles = async (selectedFiles) => {
    if (!user) {
      addToast("Please login to upload files to cloud.", "error");
      return;
    }

    setUploading(true);
    const fileArray = Array.from(selectedFiles);

    for (const file of fileArray) {
      try {
        const uploadedRecord = await uploadFile(file, user.id);
        if (uploadedRecord) {
          setFiles((prev) => [uploadedRecord, ...prev]);
          addToast(`Uploaded ${file.name} successfully`, "success");
        }
      } catch (e) {
        console.error("Failed to upload file FULL ERROR:", file.name, e);
        const errorMsg = e?.message || e?.error_description || "Unknown error";
        addToast(`Failed to upload ${file.name}: ${errorMsg}`, "error");
      }
    }
    setUploading(false);
  };

  const deleteFile = async (id) => {
    const fileToDelete = files.find((f) => f.id === id);
    if (!fileToDelete) return;

    try {
      await deleteFileService(id, fileToDelete.path, user?.id);
      setFiles(files.filter((file) => file.id !== id));
      addToast(`Deleted ${fileToDelete.name}`, "success");
    } catch (e) {
      console.error("Delete failed:", e);
      addToast(`Failed to delete ${fileToDelete.name}`, "error");
    }
  };

  const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <div className="files-dashboard page-transition">
      <header className="files-dashboard-header">
        <h1>Files</h1>
        <p>Your cloud workspace assets</p>
      </header>

      <section className="files-dashboard-top">
        <div className="files-dashboard-upload-panel files-dashboard-glass">
          {uploading ? (
            <div className="files-uploading-state">
              <h3>Uploading…</h3>
              <p>Securing your files to the cloud</p>
            </div>
          ) : (
            <FileUpload handleFiles={handleFiles} />
          )}
        </div>

        <div className="files-dashboard-stats">
          <div className="files-stat-card files-dashboard-glass">
            <div className="files-stat-icon neon-blue" aria-hidden="true">
              📄
            </div>
            <div className="files-stat-body">
              <span>Total files</span>
              {loading ? (
                <Skeleton width="36px" height="22px" />
              ) : (
                <strong>{files.length}</strong>
              )}
            </div>
          </div>

          <div className="files-stat-card files-dashboard-glass">
            <div className="files-stat-icon neon-purple" aria-hidden="true">
              💾
            </div>
            <div className="files-stat-body">
              <span>Storage used</span>
              {loading ? (
                <Skeleton width="52px" height="22px" />
              ) : (
                <strong>{sizeMB} MB</strong>
              )}
            </div>
          </div>

          <div
            className={`files-stat-card files-dashboard-glass files-stat-card--status${
              uploading ? " is-active" : ""
            }`}
          >
            <div className="files-stat-icon neon-green" aria-hidden="true">
              {uploading ? "⏳" : "✓"}
            </div>
            <div className="files-stat-body">
              <span>Upload status</span>
              <strong>{uploading ? "Uploading…" : "Ready"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="files-dashboard-recent files-dashboard-glass">
        <div className="files-recent-header">
          <h2>Recent uploads</h2>
          {!loading && (
            <span className="files-recent-count">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="files-skeleton-grid">
            <Skeleton width="100%" height="168px" borderRadius="16px" />
            <Skeleton width="100%" height="168px" borderRadius="16px" />
            <Skeleton width="100%" height="168px" borderRadius="16px" />
            <Skeleton width="100%" height="168px" borderRadius="16px" />
          </div>
        ) : (
          <FileList files={files} deleteFile={deleteFile} />
        )}
      </section>
    </div>
  );
}

export default FilesPage;
