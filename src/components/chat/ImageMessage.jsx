import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Download, Copy } from "lucide-react";
import { downloadImage, copyImageToClipboard } from "../../services/imageGenerationService";
import { resolveImageDisplayUrl } from "../../services/imageStorageService";
import { useToast } from "../../context/ToastContext";
import "./ImageMessage.css";

function ImageMessage({ imageUrl, imageId, prompt }) {
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { addToast } = useToast();

  const blobUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      setLoading(true);
      setLoadError(false);
      setDisplayUrl(null);

      try {
        const url = await resolveImageDisplayUrl(imageUrl, imageId);
        if (cancelled) {
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        if (!url) {
          setLoadError(true);
        } else {
          if (url.startsWith("blob:")) blobUrlRef.current = url;
          setDisplayUrl(url);
        }
      } catch (error) {
        console.error("Image load error:", error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!imageUrl && !imageId) {
      setLoading(false);
      setLoadError(true);
      return;
    }

    loadImage();

    return () => {
      cancelled = true;
      if (blobUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [imageUrl, imageId]);

  const fetchDisplayBlob = useCallback(async () => {
    if (!displayUrl) throw new Error("Image not loaded");
    const response = await fetch(displayUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    return response.blob();
  }, [displayUrl]);

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const blob = await fetchDisplayBlob();
      const filename = `generated-image-${Date.now()}.png`;
      downloadImage(blob, filename);
      addToast("Image downloaded successfully", "success");
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download image", "error");
    } finally {
      setDownloading(false);
    }
  }, [fetchDisplayBlob, addToast]);

  const handleCopy = useCallback(async () => {
    try {
      setCopying(true);
      const blob = await fetchDisplayBlob();
      await copyImageToClipboard(blob);
      addToast("Image copied to clipboard", "success");
    } catch (error) {
      console.error("Copy error:", error);
      addToast("Failed to copy image", "error");
    } finally {
      setCopying(false);
    }
  }, [fetchDisplayBlob, addToast]);

  return (
    <div className="image-message">
      <div className="image-container">
        {loading && (
          <div className="image-loading" aria-label="Loading image">
            Loading image…
          </div>
        )}
        {!loading && loadError && (
          <div className="image-loading image-error" aria-label="Image unavailable">
            Image unavailable
          </div>
        )}
        {!loading && displayUrl && (
          <img src={displayUrl} alt={prompt || "Generated image"} className="generated-image" />
        )}

        <div className="image-controls">
          <button
            className="control-btn"
            onClick={handleDownload}
            disabled={downloading || !displayUrl}
            title="Download image"
            aria-label="Download image"
          >
            <Download size={18} />
          </button>

          <button
            className="control-btn"
            onClick={handleCopy}
            disabled={copying || !displayUrl}
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>

      {prompt && (
        <div className="image-prompt">
          <p className="prompt-label">Prompt:</p>
          <p className="prompt-text">{prompt}</p>
        </div>
      )}
    </div>
  );
}

export default memo(ImageMessage);
