// hooks/usePreviousEffect.js
import { createEffect } from 'solid-js';

export function usePreviousEffect<T>(value: () => T, effect: (current: T, previous?: T) => void) {
  let previousValue: T | undefined;
  createEffect(() => {
    const currentValue = value();
    // Check if the current value is different from the previous one
    if (currentValue !== previousValue) {
      effect(currentValue, previousValue);
    }

    previousValue = currentValue;
  });
}
