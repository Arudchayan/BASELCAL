import { AnimatePresence, motion } from 'framer-motion';
import { useMotionPrefs } from './useMotionPrefs';

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
  const motionPrefs = useMotionPrefs();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="toast no-print"
          role="status"
          initial={{ opacity: 0, y: motionPrefs.y(10) }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: motionPrefs.y(10) }}
          transition={motionPrefs.slide}
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
