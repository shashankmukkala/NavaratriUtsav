/** Canvas-based crop: takes the pixel crop rectangle react-easy-crop reports
 * and draws just that region of the original image onto a same-size canvas,
 * exported as a JPEG blob ready to upload in place of the original file. */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

// A modern phone photo cropped at its native resolution (often 3000-4000px
// wide) produces a multi-MB JPEG at quality 0.92 — massive overkill for a
// box that never renders wider than ~800px even on a retina screen, and
// slow enough to load that people were seeing a blank gap where the photo
// hadn't finished painting yet. Capping the output width keeps every
// upload small and fast regardless of the source photo's resolution.
const MAX_OUTPUT_WIDTH = 1600;

export async function getCroppedImageBlob(
  imageSrc: string,
  croppedAreaPixels: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const scale = Math.min(1, MAX_OUTPUT_WIDTH / croppedAreaPixels.width);
  const outputWidth = Math.round(croppedAreaPixels.width * scale);
  const outputHeight = Math.round(croppedAreaPixels.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop image"))),
      "image/jpeg",
      0.85
    );
  });
}
