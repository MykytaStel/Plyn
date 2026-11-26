import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uk } from '../../i18n/locales/uk';
import { markUpdateReady, resetUpdateState } from '../../services/pwa/updates';
import { UpdateNotice } from './UpdateNotice';

afterEach(() => resetUpdateState());

describe('UpdateNotice', () => {
  it('stays hidden until a new version is waiting', () => {
    render(<UpdateNotice />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('offers the update and applies it only on a tap', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    render(<UpdateNotice />);
    act(() => markUpdateReady(apply));
    expect(screen.getByRole('status').textContent).toContain(uk.library.update.ready);
    expect(apply).not.toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole('button', { name: uk.library.update.apply }));
    expect(apply).toHaveBeenCalledOnce();
  });
});
