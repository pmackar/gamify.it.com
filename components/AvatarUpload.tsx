"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2 } from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Use JPEG, PNG, WebP, or GIF.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 2MB.";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
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
    // Reset input so same file can be selected again
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

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove avatar");
      }

      onAvatarChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || currentAvatar;

  return (
    <div className="avatar-upload-wrapper">
      <div
        className={`avatar-upload-container ${isDragging ? "dragging" : ""} ${isUploading ? "uploading" : ""}`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={displayName}
            className="avatar-image"
            style={{ width: size, height: size }}
          />
        ) : (
          <div className="avatar-placeholder" style={{ width: size, height: size }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="avatar-overlay">
          {isUploading ? (
            <Loader2 className="avatar-icon spinning" />
          ) : (
            <Camera className="avatar-icon" />
          )}
        </div>

        {currentAvatar && !isUploading && (
          <button
            className="avatar-remove-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveAvatar();
            }}
            title="Remove avatar"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="avatar-input"
      />

      {error && <p className="avatar-error">{error}</p>}

      <style jsx>{`
        .avatar-upload-wrapper {
          position: relative;
          display: inline-block;
        }

        .avatar-upload-container {
          position: relative;
          border-radius: 16px;
          cursor: pointer;
          overflow: hidden;
          border: 3px solid var(--theme-gold);
          box-shadow: 0 0 30px var(--theme-gold-glow);
          transition: all 0.2s ease;
        }

        .avatar-upload-container:hover {
          transform: scale(1.02);
          box-shadow: 0 0 40px var(--theme-gold-glow);
        }

        .avatar-upload-container.dragging {
          border-color: var(--app-travel);
          box-shadow: 0 0 40px var(--app-travel-glow);
        }

        .avatar-upload-container.uploading {
          opacity: 0.8;
          cursor: wait;
        }

        .avatar-image {
          display: block;
          object-fit: cover;
        }

        .avatar-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--theme-gold) 0%, #FFA500 100%);
          color: #1a1a1a;
          font-size: 1.5rem;
          font-family: "Press Start 2P", monospace;
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .avatar-upload-container:hover .avatar-overlay,
        .avatar-upload-container.uploading .avatar-overlay {
          opacity: 1;
        }

        .avatar-icon {
          width: 24px;
          height: 24px;
          color: white;
        }

        .avatar-icon.spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .avatar-remove-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          border: 2px solid var(--theme-bg-base);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 10;
        }

        .avatar-upload-container:hover .avatar-remove-btn {
          opacity: 1;
        }

        .avatar-remove-btn:hover {
          background: #dc2626;
        }

        .avatar-input {
          display: none;
        }

        .avatar-error {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 0.5rem;
          font-size: 0.4rem;
          color: #ef4444;
          white-space: nowrap;
          font-family: "Press Start 2P", monospace;
        }
      `}</style>
    </div>
  );
}
