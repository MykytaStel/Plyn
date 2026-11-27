import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentMeta } from '../../core/models/types';
import { uk } from '../../i18n/locales/uk';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LibraryCard } from './LibraryCard';

function meta(over: Partial<DocumentMeta> = {}): DocumentMeta {
  return {
    id: 'd',
    schemaVersion: 1,
    title: 'Книга',
    charOffset: 0,
    createdAt: 0,
    updatedAt: 0,
    bookmarkOffsets: [],
    textHash: 'h',
    textLength: 1000,
    wordCount: 40000,
    totalCards: 10,
    currentIndex: 0,
    ...over
  };
}

function show(doc: DocumentMeta, wpm = 200) {
  return render(
    <LibraryCard
      doc={doc}
      wordsPerMinute={wpm}
      onOpen={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
    />
  );
}

beforeEach(() => {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
});

describe('LibraryCard time left', () => {
  it('shows hours for a long unread text at the given pace', () => {
    show(meta());
    expect(screen.getByText(/~3 год/)).toBeTruthy();
  });

  it('counts only the words that remain', () => {
    // Half read: 20,000 words at 200 wpm = 100 minutes, about 2 hours.
    show(meta({ charOffset: 500 }));
    expect(screen.getByText(/~2 год/)).toBeTruthy();
  });

  it('uses all words when the text length is unknown', () => {
    show(meta({ textLength: 0, charOffset: 500 }));
    expect(screen.getByText(/~3 год/)).toBeTruthy();
  });

  it('says finished, with no time, for a finished text', () => {
    show(meta({ completedOnce: true }));
    expect(screen.getByText(new RegExp(uk.libraryCard.finished))).toBeTruthy();
    expect(screen.queryByText(/~/)).toBeNull();
  });

  it('shows no time when the reader turned it off', () => {
    useSettingsStore.setState({ showTimeLeft: false });
    show(meta());
    expect(screen.queryByText(/~/)).toBeNull();
  });
});
