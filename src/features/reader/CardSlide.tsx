import { useMemo } from 'react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import { detectContentLanguage } from '../../core/language/detectContentLanguage';
import type { ReadingCard } from '../../core/models/types';
import { splitCardIntoSentences } from '../../core/splitter/sentences';
import { speakSingleWord } from '../../services/speech/tts';

interface CardSlideProps {
  card: ReadingCard;
  previousSnippet?: string;
  total: number;
  anchorMode: boolean;
  sentenceFocus: boolean;
  isActiveCard: boolean;
  activeSentenceIndex: number;
  isWithinWindow: boolean;
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

export function CardSlide({
  card,
  previousSnippet,
  total,
  anchorMode,
  sentenceFocus,
  isActiveCard,
  activeSentenceIndex,
  isWithinWindow
}: CardSlideProps) {
  const sentences = useMemo(
    () =>
      isWithinWindow && sentenceFocus
        ? splitCardIntoSentences(card.text)
        : null,
    [isWithinWindow, sentenceFocus, card.text]
  );

  const useSentenceHighlight = Boolean(
    sentences && sentences.length > 1 && isActiveCard
  );

  return (
    <article
      className="card-slide"
      data-index={card.index}
      lang={detectContentLanguage(card.text)}
    >
      {isWithinWindow && (
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
            <div className="card-hint">
              {sentenceFocus
                ? 'Тапни або натисни Пробіл для наступного речення · 2× тап по слову — озвучити'
                : 'Свайпни вгору або натисни Пробіл · 2× тап по слову — озвучити'}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
