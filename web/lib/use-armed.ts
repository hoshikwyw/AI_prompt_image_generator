"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Long enough to read the warning and click again; short enough to not linger. */
const DISARM_AFTER_MS = 4000;

/**
 * The state behind a two-step destructive button: the first click arms it, the
 * second does the deed, and it disarms itself after a few seconds so a stray
 * click never sits primed. The second click is the confirmation, in place of a
 * `confirm()` dialog that cannot be styled and interrupts the page.
 */
export function useArmed() {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const disarm = useCallback(() => {
    window.clearTimeout(timer.current);
    setArmed(false);
  }, []);

  const arm = useCallback(() => {
    window.clearTimeout(timer.current);
    setArmed(true);
    timer.current = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS);
  }, []);

  // No state update on a component that has already gone.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { armed, arm, disarm };
}
