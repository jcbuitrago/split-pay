import { useRef, useState } from 'react';
import { useBill } from '../../context/BillContext';
import { scanBill, fileToBase64 } from '../../hooks/useBillScanner';
import ErrorMessage from '../ui/ErrorMessage';

export default function Step1Entry() {
  const { dispatch, nextStep } = useBill();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function haptic() {
    if ('vibrate' in navigator) navigator.vibrate(50);
  }

  function handleScanClick() {
    haptic();
    fileInputRef.current?.click();
  }

  function handleManual() {
    haptic();
    dispatch({ type: 'SET_ENTRY_MODE', mode: 'manual' });
    nextStep();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleRetake() {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUsePhoto() {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(selectedFile);
      dispatch({ type: 'SET_ORIGINAL_IMAGE', image: base64 });
      const { items } = await scanBill(base64);
      dispatch({ type: 'SET_ITEMS', items });
      dispatch({ type: 'SET_ENTRY_MODE', mode: 'scan' });
      haptic();
      nextStep();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo leer la factura. Intenta de nuevo o ingresa manualmente.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-8 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🧾</div>
        <h1 className="text-2xl font-bold text-gray-900">SplitBill</h1>
        <p className="text-gray-500 text-sm mt-1">Divide la cuenta del restaurante fácilmente</p>
      </div>

      {!preview && !isLoading && (
        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={handleScanClick}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-lg shadow-lg active:bg-indigo-700 transition-colors"
          >
            📷 Escanear factura
          </button>
          <button
            onClick={handleManual}
            className="w-full py-4 bg-white text-indigo-600 border-2 border-indigo-200 rounded-2xl font-semibold text-lg active:bg-indigo-50 transition-colors"
          >
            ✏️ Ingresar manualmente
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Leyendo tu factura...</p>
          <p className="text-gray-400 text-sm">Esto puede tomar unos segundos</p>
        </div>
      )}

      {preview && !isLoading && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden border border-gray-200">
            <img src={preview} alt="Vista previa" className="w-full object-contain max-h-64" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 active:bg-gray-100"
            >
              🔄 Retomar
            </button>
            <button
              onClick={handleUsePhoto}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold active:bg-indigo-700"
            >
              ✅ Usar esta foto
            </button>
          </div>
        </div>
      )}

      {error && (
        <ErrorMessage
          message={error}
          action={{ label: 'Ingresar manualmente', onClick: handleManual }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
