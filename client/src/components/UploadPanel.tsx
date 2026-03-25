import { useState, useRef } from "react";
import { api } from "../api";

interface Props {
  allToppings: string[];
  onOcrResult: (toppings: string[]) => void;
  onManualSelect: () => void;
}

export function UploadPanel({ onOcrResult, onManualSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("please upload an image file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const result = await api.ocr(base64, file.type);
      const matched = result.toppings
        .filter((t) => t.matched && t.canonical)
        .map((t) => t.canonical!);
      onOcrResult([...new Set(matched)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ocr failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
      <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1.5rem", lineHeight: 1.7 }}>
        upload a photo of your pizza receipt and we'll extract the toppings,
        or select them manually below.
      </p>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: "2px",
          padding: "2.5rem 1.5rem",
          cursor: loading ? "wait" : "pointer",
          marginBottom: "1rem",
        }}
        onClick={() => !loading && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
      >
        {loading ? (
          <p style={{ fontSize: "0.875rem", color: "#888" }}>reading receipt...</p>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "#888" }}>
            drop receipt image here or click to upload
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#c00", marginBottom: "0.5rem" }}>{error}</p>
      )}

      <p style={{ fontSize: "0.8125rem", color: "#ccc", margin: "1rem 0" }}>or</p>

      <span
        onClick={onManualSelect}
        style={{
          fontSize: "0.875rem",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        select toppings manually
      </span>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
