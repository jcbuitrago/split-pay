import { useRef, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useBill } from '../../context/BillContext';
import { scanBill, fileToBase64 } from '../../hooks/useBillScanner';
import ErrorMessage from '../ui/ErrorMessage';
import { useHaptic } from '../../hooks/useHaptic';

export default function Step1Entry() {
  const { dispatch, nextStep } = useBill();
  const haptic = useHaptic();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setFile(file: File) {
    setSelectedFile(file);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      haptic();
      setFile(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noClick: true, // we control clicks manually via fileInputRef
  });

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
    setFile(file);
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
      const { base64, mediaType } = await fileToBase64(selectedFile);
      dispatch({ type: 'SET_ORIGINAL_IMAGE', image: base64 });
      const { items } = await scanBill(base64, mediaType);
      dispatch({ type: 'SET_ITEMS', items });
      dispatch({ type: 'SET_ENTRY_MODE', mode: 'scan' });
      haptic([50, 30, 50]);
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
    <div
      className="flex flex-col flex-1 px-4 py-8 gap-6"
      style={{ background: 'var(--gradient-radial)' }}
      {...(preview || isLoading ? {} : getRootProps())}
    >
      {/* Header */}
      <div className="text-center pt-4">
        <div className="text-5xl mb-4">🧾</div>
        <h1 className="text-4xl font-display font-bold" style={{ color: 'var(--color-white)' }}>
          SplitBill
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
          Divide la cuenta del restaurante fácilmente
        </p>
      </div>

      {/* Drag & drop zone + botones */}
      {!preview && !isLoading && (
        <>
          <button
            type="button"
            onClick={handleScanClick}
            className="border-2 border-dashed rounded-2xl py-10 px-4 flex flex-col items-center gap-3 transition-all w-full active:opacity-80"
            style={{
              borderColor: isDragActive ? 'var(--color-purple)' : 'rgba(91,91,214,0.3)',
              backgroundColor: isDragActive ? 'rgba(91,91,214,0.08)' : 'rgba(91,91,214,0.04)',
            }}
          >
            <input {...getInputProps()} />
            <span className="text-4xl">{isDragActive ? '📂' : '📷'}</span>
            <div>
              <p className="text-base font-semibold text-center" style={{ color: 'var(--color-white)' }}>
                {isDragActive ? 'Suelta la imagen aquí' : 'Toca para subir o tomar foto'}
              </p>
              <p className="text-xs text-center mt-1" style={{ color: 'var(--color-muted)' }}>
                También puedes arrastrar una imagen aquí
              </p>
            </div>
          </button>

          <button
            onClick={handleManual}
            className="w-full py-4 rounded-full font-semibold text-lg border-2 active:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-purple)', color: 'var(--color-purple)', backgroundColor: 'transparent' }}
          >
            ✏️ Ingresar manualmente
          </button>
        </>
      )}

      {/* Skeleton loader */}
      {isLoading && (
        <div className="flex flex-col items-center gap-5 py-8">
          <div className="w-full flex flex-col gap-3 mb-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-12 rounded-2xl animate-pulse"
                style={{ backgroundColor: 'var(--color-surface)', opacity: 1 - (i - 1) * 0.2 }}
              />
            ))}
          </div>
          <div
            className="w-12 h-12 rounded-full border-4 animate-spin"
            style={{ borderColor: 'var(--color-muted-surface)', borderTopColor: 'var(--color-purple)' }}
          />
          <div className="text-center">
            <p className="font-semibold" style={{ color: 'var(--color-white)' }}>Leyendo tu factura...</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Esto puede tomar unos segundos</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !isLoading && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <img src={preview} alt="Vista previa" className="w-full object-contain max-h-64" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 rounded-2xl font-semibold border active:opacity-70 transition-opacity"
              style={{ borderColor: 'var(--color-muted-surface)', color: 'var(--color-muted)', backgroundColor: 'transparent' }}
            >
              🔄 Retomar
            </button>
            <button
              onClick={handleUsePhoto}
              className="flex-1 py-3 rounded-2xl font-bold active:opacity-80 transition-opacity shadow-navy-sm"
              style={{ backgroundColor: 'var(--color-purple)', color: '#ffffff' }}
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
