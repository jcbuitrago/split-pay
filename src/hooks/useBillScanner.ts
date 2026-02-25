import { BillItem } from '../types/bill';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

interface ScanResult {
  items: BillItem[];
}

export async function scanBill(imageBase64: string, mediaType: string): Promise<ScanResult> {
  if (!WORKER_URL) {
    throw new Error('VITE_WORKER_URL no está configurado. Revisa tu archivo .env');
  }

  const response = await fetch(`${WORKER_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, mediaType }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Error al procesar la factura');
  }

  const data = await response.json() as {
    items: { name: string; price: number; quantity: number }[];
  };

  const items: BillItem[] = data.items.map((raw, idx) => ({
    id: `scanned-${Date.now()}-${idx}`,
    name: raw.name,
    price: Math.round(raw.price),
    quantity: raw.quantity || 1,
    assignedTo: [],
  }));

  return { items };
}

const MAX_DIMENSION = 1200;
const JPEG_QUALITY  = 0.82;

export function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Redimensionar si supera MAX_DIMENSION manteniendo aspecto
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const [prefix, base64] = dataUrl.split(',');
      const mediaType = prefix.replace('data:', '').replace(';base64', '');
      resolve({ base64, mediaType });
    };

    img.onerror = reject;
    img.src = objectUrl;
  });
}
