import { useState, useRef } from "react";
import { api } from "../api";

export interface ReceiptOcrResult {
  toppings: string[];
  restaurantName: string | null;
  restaurantAddress: string | null;
}

interface Props {
  onOcrResult: (result: ReceiptOcrResult) => void;
}

export function UploadPanel({ onOcrResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("please upload an image file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { base64, mimeType } = await resizeAndEncode(file, 1200);
      const result = await api.ocr(base64, mimeType);
      const matched = result.toppings
        .filter((t) => t.matched && t.canonical)
        .map((t) => t.canonical!);
      onOcrResult({
        toppings: [...new Set(matched)],
        restaurantName: result.restaurantName ?? null,
        restaurantAddress: result.restaurantAddress ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ocr failed");
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
      <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1.5rem", lineHeight: 1.7 }}>
        snap a photo of your pizza receipt and we'll extract the toppings.
      </p>

      {loading ? (
        <p style={{ fontSize: "0.875rem", color: "#888", padding: "2.5rem 0" }}>
          reading receipt...
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          <span
            onClick={() => cameraRef.current?.click()}
            style={{
              display: "block",
              border: "1px solid #eee",
              borderRadius: "2px",
              padding: "1.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "#888",
            }}
          >
            take a photo
          </span>
          <span
            onClick={() => galleryRef.current?.click()}
            style={{
              display: "block",
              border: "1px solid #eee",
              borderRadius: "2px",
              padding: "1.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "#888",
            }}
          >
            choose from gallery
          </span>
        </div>
      )}

      {/* Camera input — opens camera on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFileChange}
      />
      {/* Gallery input — opens file picker / photo library */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileChange}
      />

      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#c00", marginBottom: "0.5rem" }}>{error}</p>
      )}
    </div>
  );
}

/**
 * Resize image client-side to maxDim (longest edge) and return
 * as base64 JPEG. Keeps receipt text legible while cutting payload
 * from ~5-10MB down to ~100-300KB.
 */
function resizeAndEncode(
  file: File,
  maxDim: number
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({
        base64: dataUrl.split(",")[1],
        mimeType: "image/jpeg",
      });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
