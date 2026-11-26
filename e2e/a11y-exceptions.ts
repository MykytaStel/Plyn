/**
 * Known axe findings that are kept on purpose, each with a reason (TESTING.md § L8).
 * 0.28 reviews every entry with readers (EXP-08) and either fixes or keeps it.
 */
export const A11Y_EXCEPTIONS: ReadonlyArray<{ selector: string; rule: string; reason: string }> = [
  {
    selector: '.card-context',
    rule: 'color-contrast',
    reason:
      'The faded tail of the previous card is a decorative, aria-hidden echo for re-orientation. ' +
      'Full contrast would compete with the card text, which is what the reader should look at.'
  }
];
