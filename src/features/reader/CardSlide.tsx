import { memo, useMemo } from 'react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import { detectContentLanguage } from '../../core/language/detectContentLanguage';
import type { ReadingCard } from '../../core/models/types';
import { splitCardIntoSentences } from '../../core/splitter/sentences';
import { useI18n } from '../../i18n';
import type { WordRange } from '../../core/speech/wordRange';
import { speakSingleWord } from '../../services/speech/tts';
import { useSettingsStore } from '../../store/useSettingsStore';

interface CardSlideProps {
  card: ReadingCard;
  previousSnippet?: string;
  total: number;
  anchorMode: boolean;
  sentenceFocus: boolean;
  isActiveCard: boolean;
  activeSentenceIndex: number;
  /** The word being read aloud, on the active card only (0.26). */
  spokenRange?: WordRange | null;
}

function speakWord(word: string) {
  const voices = useSettingsStore.getState().ttsVoices;
  speakSingleWord(word, voices[detectContentLanguage(word)]);
}

function overlaps(from: number, to: number, spoken: WordRange | null): boolean {
  return spoken !== null && spoken.start < to && spoken.end > from;
}

/**
 * Words of one piece of card text. `baseOffset` is where the piece starts in
 * the card, so the spoken range (card offsets) can be found in it.
 */
function renderInteractiveWords(
  text: string,
  anchorMode: boolean,
  baseOffset = 0,
  spoken: WordRange | null = null
) {
  const tokens = tokenizeWithAnchors(text);
  let pos = baseOffset;
  return tokens.map((token, i) => {
    const from = pos;
    if (token.type === 'word') {
      const fullWord = `${token.lead}${token.rest}`;
      pos += fullWord.length;
      const isSpoken = overlaps(from, pos, spoken);
      return (
        <span
          key={i}
          className={isSpoken ? 'readable-word is-spoken' : 'readable-word'}
          onDoubleClick={(e) => {
            e.stopPropagation();
            speakWord(fullWord);
          }}
        >
          {anchorMode ? (
            <>
              <span className="anchor-lead">{token.lead}</span>
              {token.rest}
            </>
          ) : (
            fullWord
          )}
        </span>
      );
    }
    pos += token.value.length;
    if (!spoken || !overlaps(from, pos, spoken)) return <span key={i}>{token.value}</span>;
    // Short words are plain text tokens: mark only the spoken part.
    const a = Math.max(0, spoken.start - from);
    const b = Math.min(token.value.length, spoken.end - from);
    return (
      <span key={i}>
        {token.value.slice(0, a)}
        <span className="is-spoken">{token.value.slice(a, b)}</span>
        {token.value.slice(b)}
      </span>
    );
  });
}

/** Where each sentence starts in the card text (repeats map in order). */
function sentenceOffsets(text: string, sentences: string[]): number[] {
  let cursor = 0;
  return sentences.map((sentence) => {
    const at = text.indexOf(sentence, cursor);
    const start = at === -1 ? cursor : at;
    cursor = start + sentence.length;
    return start;
  });
}

/**
 * One card of the feed. Only the cards near the current one are rendered
 * (see `feedWindow` in core/reading); memo keeps the neighbours from re-rendering when the
 * reader moves on.
 */
export const CardSlide = memo(function CardSlide({
  card,
  previousSnippet,
  total,
  anchorMode,
  sentenceFocus,
  isActiveCard,
  activeSentenceIndex,
  spokenRange = null
}: CardSlideProps) {
  const i18n = useI18n();
  const sentences = useMemo(
    () => (sentenceFocus ? splitCardIntoSentences(card.text) : null),
    [sentenceFocus, card.text]
  );

  const offsets = useMemo(
    () => (sentences ? sentenceOffsets(card.text, sentences) : []),
    [sentences, card.text]
  );

  const lang = useMemo(() => detectContentLanguage(card.text), [card.text]);

  const useSentenceHighlight = Boolean(
    sentences && sentences.length > 1 && isActiveCard
  );

  return (
    <article
      className="card-slide"
      data-index={card.index}
      lang={lang}
    >
      <div className="card-body">
        {previousSnippet && (
          <p className="card-context" aria-hidden="true">
            …{previousSnippet}
          </p>
        )}
        <p className="card-text">
          {useSentenceHighlight && sentences
            ? sentences.map((sentence, idx) => (
                <span
                  key={idx}
                  className={`sentence-segment ${
                    idx === activeSentenceIndex ? 'is-focused' : 'is-dimmed'
                  }`}
                >
                  {renderInteractiveWords(sentence, anchorMode, offsets[idx], spokenRange)}
                  {idx < sentences.length - 1 ? ' ' : ''}
                </span>
              ))
            : renderInteractiveWords(card.text, anchorMode, 0, spokenRange)}
        </p>
        {card.index === 0 && total > 1 && (
          <div className="card-hint" lang={i18n.locale}>
            {sentenceFocus
              ? i18n.m.reader.hintSentenceFocus
              : i18n.m.reader.hintSwipe}
          </div>
        )}
      </div>
    </article>
  );
});
