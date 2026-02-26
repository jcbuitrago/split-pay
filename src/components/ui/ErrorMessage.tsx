interface ErrorMessageProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function ErrorMessage({ message, action }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="text-red-500 text-lg shrink-0">⚠️</span>
        <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="self-start text-sm font-semibold text-red-600 dark:text-red-400 underline underline-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
