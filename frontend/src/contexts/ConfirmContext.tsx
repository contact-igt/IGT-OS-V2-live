'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async (message) => window.confirm(message));

export function useConfirm() {
  return useContext(ConfirmContext);
}

// App-styled replacement for window.confirm() — same call shape (await confirm(message)),
// but renders as an in-app modal instead of the browser's native dialog.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve, ...options });
    });
  }, []);

  const handle = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => handle(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl p-6"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {state.title && (
              <h3 className="font-bold text-[16px] mb-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
                {state.title}
              </h3>
            )}
            <p className="text-[14px] mb-6 leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{state.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handle(false)}
                className="px-4 py-2 text-[13px] font-bold rounded-lg transition-colors hover:opacity-80"
                style={{ color: 'var(--c-text-2)' }}
              >
                {state.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => handle(true)}
                className="px-4 py-2 text-[13px] font-bold rounded-lg text-white transition-colors hover:opacity-90"
                style={{ background: state.danger ? '#EF4444' : 'var(--c-primary)' }}
              >
                {state.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
