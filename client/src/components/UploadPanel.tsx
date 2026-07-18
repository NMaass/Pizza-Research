import { useRef, useState } from "react";
import { Button, StatusMessage } from "@nmaass/research-ui";
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
        .filter((topping) => topping.matched && topping.canonical)
        .map((topping) => topping.canonical!);

      onOcrResult({
        toppings: [...new Set(matched)],
        restaurantName: result.restaurantName ?? null,
        restaurantAddress: result.restaurantAddress ?? null,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "receipt reading failed");
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  };

  return (
    <div className="pizza-upload">
      <p className="nr-muted">snap a photo of your pizza receipt and review what we detect before submitting.</p>

      {loading ? (
        <StatusMessage variant="info" title="reading receipt">
          extracting the restaurant and toppings from the image.
        </StatusMessage>
      ) : (
        <div className="nr-stack">
          <Button onClick={() => cameraRef.current?.click()}>take a photo</Button>
          <Button onClick={() => galleryRef.current?.click()}>choose from gallery</Button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFileChange} />

      {error && <StatusMessage variant="error" title="could not read receipt">{error}</StatusMessage>}
    </div>
  );
}

function resizeAndEncode(file: File, maxDim: number): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("could not prepare receipt image"));
        return;
      }

      context.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("could not open receipt image"));
    };
    img.src = objectUrl;
  });
}
