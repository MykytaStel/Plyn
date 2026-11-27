import { memo, useMemo } from 'react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import { detectContentLanguage } from '../../core/language/detectContentLanguage';
import type { ReadingCard } from '../../core/models/types';
import { splitCardIntoSentences } from '../../core/splitter/sentences';
import { useI18n } from '../../i18n';
import { speakSingleWord } from '../../services/speech/tts';

interface CardSlideProps {
  card: ReadingCard;
  previousSnippet?: string;
  total: number;
  anchorMode: boolean;
  sentenceFocus: boolean;
  isActiveCard: boolean;
  activeSentenceIndex: number;
}

function renderInteractiveWords(text: string, anchorMode: boolean) {
  const tokens = tokenizeWithAnchors(text);
  return tokens.map((token, i) => {
    if (token.type === 'word') {
      const fullWord = `${token.lead}${token.rest}`;
      return (
        <span
          key={i}
          className="readable-word"
          onDoubleClick={(e) => {
            e.stopPropagation();
            speakSingleWord(fullWord);
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
    return <span key={i}>{token.value}</span>;
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
  activeSentenceIndex
}: CardSlideProps) {
  const i18n = useI18n();
  const sentences = useMemo(
    () => (sentenceFocus ? splitCardIntoSentences(card.text) : null),
    [sentenceFocus, card.text]
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
                  {renderInteractiveWords(sentence, anchorMode)}
                  {idx < sentences.length - 1 ? ' ' : ''}
                </span>
              ))
            : renderInteractiveWords(card.text, anchorMode)}
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
