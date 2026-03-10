interface ErrorMessageProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function ErrorMessage({ message, action }: ErrorMessageProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 border"
      style={{ backgroundColor: 'rgba(240,112,112,0.1)', borderColor: 'rgba(240,112,112,0.3)' }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">⚠️</span>
        <p className="text-sm" style={{ color: 'var(--color-rose)' }}>{message}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="self-start text-sm font-semibold underline underline-offset-2"
          style={{ color: 'var(--color-purple)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
