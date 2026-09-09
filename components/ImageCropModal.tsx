"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/cropImage";

interface ImageCropModalProps {
  imageSrc: string;
  aspect: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

/** Lets someone drag/pan and zoom to choose exactly what part of their photo
 * gets kept, instead of a fixed object-cover box silently chopping off
 * whatever didn't fit — that was cutting the top off Ganesh idol photos in
 * particular, since a tall statue photo rarely matches the card's wide
 * aspect ratio. */
export default function ImageCropModal({ imageSrc, aspect, onCancel, onCropped }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onCropped(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="card-elevated flex w-full max-w-md flex-col overflow-hidden p-5">
        <p className="text-base font-bold text-[color:var(--foreground)]">Adjust your photo</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">Drag to reposition, pinch or scroll to zoom.</p>

        <div className="relative mt-3 h-64 w-full overflow-hidden rounded-2xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-4 w-full accent-[color:var(--accent)]"
          aria-label="Zoom"
        />

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1 justify-center py-2.5">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="btn-primary flex-1 justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
