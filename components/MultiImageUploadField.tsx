"use client";

import { useRef, useState } from "react";
import { CameraIcon, CloseIcon } from "@/components/icons";

interface MultiImageUploadFieldProps {
  label: string;
  folder: "pandals" | "sponsors" | "payment-proofs";
  required?: boolean;
  max?: number;
  hint?: string;
  value: string[];
  onChange: (urls: string[]) => void;
}

/** Same dropzone pattern as ImageUploadField, but for up to `max` images —
 * shown as a row of square tiles (matching the map's ad-slot shape) with an
 * "add" tile while there's room left. */
export default function MultiImageUploadField({
  label,
  folder,
  required,
  max = 3,
  hint,
  value,
  onChange,
}: MultiImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
      onChange([...value, data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[color:var(--foreground)]">
        {label}
        {required && <span className="text-[color:var(--accent-deep)]"> *</span>}
      </label>
      {hint && <p className="text-xs text-[color:var(--muted-soft)]">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative h-24 w-24 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full rounded-xl border border-[rgba(43,22,8,0.12)] object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < max && (
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
              if (file) handleFile(file);
            }}
            className={`flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-colors ${
              dragActive
                ? "border-[color:var(--accent)] bg-[rgba(234,108,29,0.08)]"
                : "border-[rgba(43,22,8,0.18)] bg-white/50 hover:border-[rgba(234,108,29,0.5)]"
            }`}
          >
            {uploading ? (
              <span className="text-[0.625rem] text-[color:var(--muted)]">Uploading…</span>
            ) : (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
                  <CameraIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[0.625rem] font-semibold text-[color:var(--foreground)]">
                  {value.length === 0 ? "Add photo" : `Add (${value.length}/${max})`}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-[color:var(--coral-deep)]">{error}</p>}
    </div>
  );
}
