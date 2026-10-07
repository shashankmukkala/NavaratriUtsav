"use client";

import { useRef, useState } from "react";
import ImageCropModal from "@/components/ImageCropModal";
import { CameraIcon, CloseIcon } from "@/components/icons";

interface ImageUploadFieldProps {
  label: string;
  folder: "pandals" | "sponsors" | "payment-proofs" | "settings";
  required?: boolean;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Fired alongside onChange whenever the upload response includes a
   * generated thumbnail (currently only for folder="pandals") — callers
   * that store a pandal's thumbnail_url wire this up; everyone else can
   * ignore it. */
  onThumbnailChange?: (url: string | null) => void;
  /** When given, a selected photo goes through a drag/zoom crop step at this
   * aspect ratio before uploading — for photos shown in a fixed-shape frame
   * (listing photos, banners), where object-cover would otherwise silently
   * chop off whatever didn't fit. Omit for images that should stay exactly
   * as uploaded (payment screenshots, QR codes). */
  aspect?: number;
}

/** Uploads an image via /api/upload and reports back the public URL. A
 * dropzone-style picker — click or drag a photo in — instead of the raw
 * native file input, which looks inconsistent across browsers. */
export default function ImageUploadField({ label, folder, required, value, onChange, onThumbnailChange, aspect }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      onChange(data.url);
      onThumbnailChange?.(data.thumbnail_url ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      onChange(null);
      onThumbnailChange?.(null);
    } finally {
      setUploading(false);
    }
  };

  // With an aspect ratio given, a picked file goes to the crop step first
  // instead of straight to upload — see ImageCropModal.
  const pickFile = (file: File) => {
    if (aspect) {
      setCropSrc(URL.createObjectURL(file));
    } else {
      handleFile(file);
    }
  };

  const closeCropModal = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCropped = (blob: Blob) => {
    closeCropModal();
    handleFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[color:var(--foreground)]">
        {label}
        {required && <span className="text-[color:var(--accent-deep)]"> *</span>}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pickFile(file);
        }}
        className="hidden"
      />

      {value && !uploading ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-44 w-full rounded-2xl border border-[rgba(43,22,8,0.12)] object-cover shadow-lg" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove photo"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] shadow-sm transition-colors hover:bg-white"
          >
            Change photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) pickFile(file);
          }}
          className={`flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors ${
            dragActive ? "border-[color:var(--accent)] bg-[rgba(234,108,29,0.08)]" : "border-[rgba(43,22,8,0.18)] bg-white/50 hover:border-[rgba(234,108,29,0.5)]"
          }`}
        >
          {uploading ? (
            <p className="text-sm text-[color:var(--muted)]">Uploading…</p>
          ) : (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
                <CameraIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-[color:var(--foreground)]">Click or drag a photo here</span>
              <span className="text-xs text-[color:var(--muted-soft)]">PNG, JPG or WEBP</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-[color:var(--coral-deep)]">{error}</p>}

      {cropSrc && aspect && <ImageCropModal imageSrc={cropSrc} aspect={aspect} onCancel={closeCropModal} onCropped={handleCropped} />}
    </div>
  );
}
