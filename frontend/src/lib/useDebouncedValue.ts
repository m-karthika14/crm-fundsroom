import { useEffect, useState } from "react";

// Delays updating the returned value until the input has been stable
// for `delayMs` -- used on search boxes so we don't fire an API
// request on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
