import { useAppContext } from "../../context/AppContext";
import { useState } from "react";
import "./UpdateNotification.css";

export default function UpdateNotification() {
  const { updateAvailable, updateProgress, updateDownloaded, installUpdate } = useAppContext();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleInstall = () => {
    if (updateDownloaded) {
      installUpdate();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="update-notification">
      <div className="update-content">
        <div className="update-header">
          <div className="update-icon">🔄</div>
          <div className="update-text">
            <h3>Update Available</h3>
            <p>Version {updateAvailable.version} is ready to install</p>
          </div>
        </div>

        {updateProgress && (
          <div className="update-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${updateProgress.percent}%`,
                }}
              ></div>
            </div>
            <span className="progress-text">
              {Math.round(updateProgress.percent)}%
            </span>
          </div>
        )}

        {updateDownloaded && (
          <div className="update-actions">
            <button
              className="btn-restart"
              onClick={handleInstall}
            >
              Restart & Install
            </button>
            <button
              className="btn-dismiss"
              onClick={handleDismiss}
            >
              Later
            </button>
          </div>
        )}

        {!updateDownloaded && !updateProgress && (
          <div className="update-downloading">
            <div className="spinner"></div>
            <p>Downloading update...</p>
          </div>
        )}
      </div>
    </div>
  );
}
