import { AnimatePresence, motion } from 'framer-motion';

export type ToastData = {
  message: string;
  action?: { label: string; onClick: () => void };
};

/**
 * Toast — pure presentational leaf extracted from App (plan step 46).
 * App owns the timer and the toast state; this only renders and dismisses.
 */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="toast no-print"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {toast.message}
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
