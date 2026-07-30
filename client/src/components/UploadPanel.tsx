import { useRef, useState } from "react";
import { api, type ReceiptPizzaMatch, type ToppingMatch } from "../api";
import { Button, StatusMessage } from "../research-ui";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface ReceiptOcrResult {
  toppings: string[];
  unresolvedToppings: string[];
  restaurantName: string | null;
  restaurantAddress: string | null;
}

interface ReceiptReview {
  pizzas: ReceiptPizzaMatch[];
  restaurantName: string | null;
  restaurantAddress: string | null;
}

interface Props {
  onOcrResult: (result: ReceiptOcrResult) => void;
}

export function UploadPanel({ onOcrResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReceiptReview | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("please upload an image file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("the receipt image is too large; choose an image under 20 MB");
      return;
    }

    setLoading(true);
    setError(null);
    setReview(null);
    try {
      const { base64, mimeType } = await resizeAndEncode(file, 1600);
      const result = await api.ocr(base64, mimeType);
      const pizzas = result.pizzas
        .map((pizza) => ({
          ...pizza,
          toppings: deduplicateMatches(pizza.toppings),
        }))
        .filter((pizza) => pizza.toppings.length > 0);

      if (pizzas.length === 0) {
        onOcrResult({
          toppings: [],
          unresolvedToppings: [],
          restaurantName: result.restaurantName,
          restaurantAddress: result.restaurantAddress,
        });
        return;
      }

      const nextReview: ReceiptReview = {
        pizzas,
        restaurantName: result.restaurantName,
        restaurantAddress: result.restaurantAddress,
      };
      if (pizzas.length === 1) {
        await choosePizza(nextReview, 0);
      } else {
        setReview(nextReview);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "receipt reading failed");
    } finally {
      setLoading(false);
    }
  };

  const choosePizza = async (receipt: ReceiptReview, index: number) => {
    const pizza = receipt.pizzas[index];
    if (!pizza) return;

    setLoading(true);
    setError(null);
    try {
      const resolved: Array<{ raw: string; canonical: string | null }> = [];
      for (const match of pizza.toppings) {
        resolved.push(await resolveTopping(match));
      }
      const toppings = resolved
        .map((entry) => entry.canonical)
        .filter((topping): topping is string => topping !== null);
      const unresolvedToppings = resolved
        .filter((entry) => entry.canonical === null)
        .map((entry) => entry.raw);

      onOcrResult({
        toppings: [...new Set(toppings)],
        unresolvedToppings,
        restaurantName: receipt.restaurantName,
        restaurantAddress: receipt.restaurantAddress,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "topping normalization failed");
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
      <p className="nr-muted">
        snap a photo of your pizza receipt and review what we detect before submitting.
      </p>

      {loading ? (
        <StatusMessage variant="info" title="reading receipt">
          extracting the restaurant and pizza line items from the image.
        </StatusMessage>
      ) : review ? (
        <section aria-labelledby="receipt-pizza-title">
          <p id="receipt-pizza-title" className="pizza-small-label">
            choose the pizza you are recording
          </p>
          <div className="nr-stack nr-stack-sm">
            {review.pizzas.map((pizza, index) => (
              <Button key={`${pizza.label ?? "pizza"}-${index}`} onClick={() => void choosePizza(review, index)}>
                <span>{pizza.label?.trim() || `pizza ${index + 1}`}</span>
                <span className="pizza-receipt-option-toppings">
                  {pizza.toppings.map(displayTopping).join(" + ")}
                </span>
              </Button>
            ))}
            <Button variant="quiet" onClick={() => setReview(null)}>
              scan another receipt
            </Button>
          </div>
        </section>
      ) : (
        <div className="nr-stack nr-stack-sm">
          <Button onClick={() => cameraRef.current?.click()}>take a photo</Button>
          <Button onClick={() => galleryRef.current?.click()}>choose from gallery</Button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        hidden
        onChange={onFileChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        onChange={onFileChange}
      />

      {error && (
        <StatusMessage variant="error" title="could not read receipt">
          {error}
        </StatusMessage>
      )}
    </div>
  );
}

function displayTopping(match: ToppingMatch): string {
  return match.canonical ?? match.raw;
}

function deduplicateMatches(matches: ToppingMatch[]): ToppingMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = match.raw.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function resolveTopping(match: ToppingMatch): Promise<{ raw: string; canonical: string | null }> {
  if (match.matched && match.canonical) {
    return { raw: match.raw, canonical: match.canonical };
  }

  try {
    const normalized = await api.normalize(match.raw);
    return {
      raw: match.raw,
      canonical: normalized.action === "match" ? normalized.canonical : normalized.name,
    };
  } catch {
    return { raw: match.raw, canonical: null };
  }
}

function resizeAndEncode(file: File, maxDimension: number): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        let { width, height } = image;
        if (width <= 0 || height <= 0) throw new Error("receipt image has invalid dimensions");

        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("could not prepare receipt image");

        context.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error("could not encode receipt image");
        resolve({ base64, mimeType: "image/jpeg" });
      } catch (cause) {
        reject(cause instanceof Error ? cause : new Error("could not prepare receipt image"));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("could not open receipt image"));
    };
    image.src = objectUrl;
  });
}
