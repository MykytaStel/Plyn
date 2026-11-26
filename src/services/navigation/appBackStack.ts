import { createBackStack, type BackStack } from './backStack';

let stack: BackStack | null = null;

/** The one back stack of this page, bound to `window.history`. */
export function appBackStack(): BackStack {
  stack ??= createBackStack(window.history, window);
  return stack;
}
