import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useDialogFocus } from './useDialogFocus';

function Dialog({ name, onClose, onNext }: { name: string; onClose: () => void; onNext?: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>();
  return (
    <div ref={ref} role="dialog" aria-label={name}>
      <button type="button" onClick={onClose}>
        Close {name}
      </button>
      {onNext && (
        <button type="button" onClick={onNext}>
          Next
        </button>
      )}
      <input aria-label={`Field ${name}`} />
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState<'none' | 'menu' | 'detail'>('none');
  return (
    <>
      <button type="button" onClick={() => setOpen('menu')}>
        Open
      </button>
      <button type="button">Other</button>
      {open === 'menu' && (
        <Dialog name="menu" onClose={() => setOpen('none')} onNext={() => setOpen('detail')} />
      )}
      {open === 'detail' && <Dialog name="detail" onClose={() => setOpen('none')} />}
    </>
  );
}

describe('useDialogFocus', () => {
  it('moves focus into the dialog and back to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close menu' }));

    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Field menu' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close menu' }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Field menu' }));
  });

  it('a dialog opened from another returns focus past it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close detail' }));

    await user.click(screen.getByRole('button', { name: 'Close detail' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
  });
});
