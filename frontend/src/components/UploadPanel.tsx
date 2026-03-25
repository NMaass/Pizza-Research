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
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
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
      const unique = [...new Set(matched)];
      onOcrResult(unique);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="panel upload-panel">
      <h2>Upload a Pizza Receipt</h2>
      <p>Snap a photo of your pizza receipt and we'll extract the toppings, or select them manually.</p>

      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""} ${loading ? "loading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <span className="drop-icon">📸</span>
            <span>Drop receipt image here or click to upload</span>
          </>
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

      {error && <p className="error">{error}</p>}

      <div className="divider">
        <span>or</span>
      </div>

      <button className="btn btn-secondary" onClick={onManualSelect}>
        Select Toppings Manually
      </button>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:xxx;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
