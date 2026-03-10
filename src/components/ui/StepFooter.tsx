interface StepFooterProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  backLabel?: string;
}

export default function StepFooter({
  onBack,
  onContinue,
  continueLabel = 'Continuar →',
  continueDisabled = false,
  backLabel = '← Atrás',
}: StepFooterProps) {
  return (
    <div
      className="flex gap-3 px-4 py-4 border-t"
      style={{ backgroundColor: 'var(--color-darkest)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-2xl font-semibold text-sm active:opacity-70 transition-opacity border"
          style={{ borderColor: 'var(--color-muted-surface)', color: 'var(--color-muted)', backgroundColor: 'transparent' }}
        >
          {backLabel}
        </button>
      )}
      {onContinue && (
        <button
          onClick={onContinue}
          disabled={continueDisabled}
          className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-40 active:opacity-80 transition-opacity shadow-navy-sm"
          style={{ backgroundColor: 'var(--color-purple)', color: '#ffffff' }}
        >
          {continueLabel}
        </button>
      )}
    </div>
  );
}
