import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReadingCard } from '../../core/models/types';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useSettingsStore } from '../../store/useSettingsStore';
import { CardSlide } from './CardSlide';

vi.mock('../../services/speech/tts', () => ({ speakSingleWord: vi.fn() }));
const { speakSingleWord } = await import('../../services/speech/tts');

const card = (text: string): ReadingCard => ({ index: 0, text, startOffset: 0, endOffset: text.length });

function renderCard(text: string, props: Partial<Parameters<typeof CardSlide>[0]> = {}) {
  return render(
    <CardSlide
      card={card(text)}
      total={1}
      anchorMode={false}
      sentenceFocus={false}
      isActiveCard
      activeSentenceIndex={0}
      {...props}
    />
  );
}

beforeEach(() => useSettingsStore.setState({ ...DEFAULT_SETTINGS }));

describe('CardSlide spoken word', () => {
  it('marks the spoken word', () => {
    const { container } = renderCard('Ранок був тихий.', { spokenRange: { start: 6, end: 9 } });
    const marked = container.querySelectorAll('.is-spoken');
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toBe('був');
    expect(container.querySelector('.card-text')?.textContent).toBe('Ранок був тихий.');
  });

  it('marks a long word, also with anchors on', () => {
    const { container } = renderCard('Ранок був тихий.', {
      spokenRange: { start: 0, end: 5 },
      anchorMode: true
    });
    const marked = container.querySelectorAll('.is-spoken');
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toBe('Ранок');
  });

  it('marks the right word inside sentence focus, also when a sentence repeats', () => {
    const { container } = renderCard('Так. Так. Ні.', {
      sentenceFocus: true,
      spokenRange: { start: 5, end: 8 }
    });
    const segments = container.querySelectorAll('.sentence-segment');
    expect(segments[0].querySelector('.is-spoken')).toBeNull();
    expect(segments[1].querySelector('.is-spoken')?.textContent).toBe('Так');
  });

  it('marks nothing without a range', () => {
    const { container } = renderCard('Ранок був тихий.');
    expect(container.querySelector('.is-spoken')).toBeNull();
  });

  it('uses the saved voice for a double tap', () => {
    useSettingsStore.setState({ ttsVoices: { uk: 'lesya' } });
    const { getByText } = renderCard('Ранок був тихий.');
    fireEvent.doubleClick(getByText('Ранок'));
    expect(speakSingleWord).toHaveBeenCalledWith('Ранок', 'lesya');
  });
});
