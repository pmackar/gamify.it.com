"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentAvatar: string | null;
  displayName: string;
  onAvatarChange: (newAvatarUrl: string | null) => void;
  size?: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUpload({
  currentAvatar,
  displayName,
  onAvatarChange,
  size = 80,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Use JPEG, PNG, WebP, or GIF";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Max size is 2MB";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setError(null);
    setIsUploading(true);

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onAvatarChange(data.avatarUrl);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemoveAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove");
      }

      onAvatarChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const displayUrl = previewUrl || currentAvatar;
  const isLoading = isUploading || isDeleting;

  return (
    <div className="avatar-upload-wrapper">
      <div
        className={`avatar-container ${isDragging ? "dragging" : ""} ${isLoading ? "loading" : ""}`}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={displayName} className="avatar-img" />
        ) : (
          <div className="avatar-fallback">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Hover overlay */}
        <div className="avatar-overlay">
          {isLoading ? (
            <Loader2 className="overlay-icon spin" />
          ) : (
            <Camera className="overlay-icon" />
          )}
          <span className="overlay-text">{isLoading ? "..." : "Change"}</span>
        </div>

        {/* Error toast */}
        {error && (
          <div className="avatar-error">
            {error}
          </div>
        )}
      </div>

      {/* Delete button - separate from main container */}
      {currentAvatar && !isLoading && (
        <button
          className="delete-btn"
          onClick={handleRemoveAvatar}
          title="Remove photo"
        >
          <Trash2 size={10} />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <style jsx>{`
        .avatar-upload-wrapper {
          position: relative;
          display: inline-block;
        }

        .avatar-container {
          position: relative;
          border-radius: 16px;
          cursor: pointer;
          overflow: hidden;
          border: 3px solid var(--theme-gold);
          box-shadow: 0 0 20px var(--theme-gold-glow);
          transition: all 0.2s ease;
          background: var(--theme-bg-card);
        }

        .avatar-container:hover:not(.loading) {
          border-color: #ffd700;
          box-shadow: 0 0 30px var(--theme-gold-glow);
        }

        .avatar-container.dragging {
          border-color: var(--app-travel);
          box-shadow: 0 0 30px var(--app-travel-glow);
        }

        .avatar-container.loading {
          cursor: wait;
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--theme-gold) 0%, #FFA500 100%);
          color: #1a1a1a;
          font-size: 1.8rem;
          font-family: "Press Start 2P", monospace;
          font-weight: bold;
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .avatar-container:hover .avatar-overlay,
        .avatar-container.loading .avatar-overlay {
          opacity: 1;
        }

        .overlay-icon {
          width: 20px;
          height: 20px;
          color: white;
        }

        .overlay-icon.spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .overlay-text {
          font-size: 0.45rem;
          color: white;
          font-family: "Press Start 2P", monospace;
          text-transform: uppercase;
        }

        .delete-btn {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--theme-bg-card);
          border: 2px solid var(--theme-border);
          color: var(--theme-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .avatar-upload-wrapper:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: white;
        }

        .avatar-error {
          position: absolute;
          bottom: -28px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(239, 68, 68, 0.95);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.4rem;
          font-family: "Press Start 2P", monospace;
          white-space: nowrap;
          z-index: 20;
          animation: fadeIn 0.2s ease;
        }

        .avatar-error::before {
          content: '';
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 4px solid rgba(239, 68, 68, 0.95);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
