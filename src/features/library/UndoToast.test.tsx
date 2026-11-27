import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uk } from '../../i18n/locales/uk';
import { UndoToast } from './UndoToast';

afterEach(() => vi.useRealTimers());

describe('UndoToast', () => {
  it('moves focus to Undo and calls it on click', async () => {
    const onUndo = vi.fn();
    render(
      <UndoToast message="«Книга» видалено." undoLabel={uk.library.feedback.undo} onUndo={onUndo} onExpire={() => {}} />
    );
    const button = screen.getByRole('button', { name: uk.library.feedback.undo });
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole('status').textContent).toContain('«Книга» видалено.');

    await userEvent.click(button);
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('leaves focus alone with focusAction false', () => {
    render(
      <UndoToast message="x" undoLabel="View" focusAction={false} onUndo={() => {}} onExpire={() => {}} />
    );
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'View' }));
  });

  it('expires after its time', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    render(<UndoToast message="x" undoLabel="Undo" onUndo={() => {}} onExpire={onExpire} durationMs={6000} />);

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
