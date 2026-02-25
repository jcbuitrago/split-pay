import { BillItem } from '../types/bill';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

interface ScanResult {
  items: BillItem[];
}

export async function scanBill(imageBase64: string): Promise<ScanResult> {
  if (!WORKER_URL) {
    throw new Error('VITE_WORKER_URL no está configurado. Revisa tu archivo .env');
  }

  const response = await fetch(`${WORKER_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
