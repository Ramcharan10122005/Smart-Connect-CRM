import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a fast-changing value
 * @param {any} value
 * @param {number} delay - delay in milliseconds (default: 300)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
