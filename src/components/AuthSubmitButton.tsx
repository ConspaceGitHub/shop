export type SubmitState = 'idle' | 'submitting' | 'success';

interface AuthSubmitButtonProps {
  state: SubmitState;
  idleLabel: string;
  submittingLabel: string;
  successLabel: string;
}

function AuthSubmitButton({ state, idleLabel, submittingLabel, successLabel }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={state !== 'idle'}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white transition-all active:scale-95 disabled:cursor-not-allowed ${
        state === 'success' ? 'bg-forest-500' : 'bg-forest-700 hover:bg-forest-800 disabled:bg-forest-200'
      }`}
    >
      {state === 'submitting' && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {state === 'success' && <span className="animate-badge-pop">✓</span>}
      <span>{state === 'idle' ? idleLabel : state === 'submitting' ? submittingLabel : successLabel}</span>
    </button>
  );
}

export default AuthSubmitButton;
