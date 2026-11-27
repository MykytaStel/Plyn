import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getI18n } from '../../i18n';
import { uk } from '../../i18n/locales/uk';
import { DoneSlide } from './DoneSlide';

const noop = () => {};

describe('DoneSlide thoughts line (0.27)', () => {
  it('shows no thoughts line with 0 thoughts', () => {
    render(
      <DoneSlide total={5} sessionThoughts={0} onViewThoughts={noop} onRestart={noop} onBackToLibrary={noop} />
    );
    expect(screen.queryByRole('button', { name: uk.reader.doneSlide.viewThoughts })).toBeNull();
  });

  it('shows the count and a View button with thoughts', () => {
    render(
      <DoneSlide total={5} sessionThoughts={2} onViewThoughts={noop} onRestart={noop} onBackToLibrary={noop} />
    );
    expect(screen.getByText(getI18n('uk').plural(uk.reader.doneSlide.thoughts, 2))).toBeTruthy();
    expect(screen.getByRole('button', { name: uk.reader.doneSlide.viewThoughts })).toBeTruthy();
  });
});
