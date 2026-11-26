import { useMemo } from 'react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import type { ReadingCard } from '../../core/models/types';
import { splitCardIntoSentences } from '../../core/splitter/sentences';

interface CardSlideProps {
  card: ReadingCard;
  total: number;
  anchorMode: boolean;
  sentenceFocus: boolean;
  isActiveCard: boolean;
  activeSentenceIndex: number;
  isWithinWindow: boolean;
}

function renderAnchorText(text: string, anchorMode: boolean) {
  if (!anchorMode) return text;
  const tokens = tokenizeWithAnchors(text);
  return tokens.map((token, i) =>
    token.type === 'word' ? (
      <span key={i}>
        <span className="anchor-lead">{token.lead}</span>
        {token.rest}
      </span>
    ) : (
      <span key={i}>{token.value}</span>
    )
  );
}

export function CardSlide({
  card,
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
    <article className="card-slide" data-index={card.index}>
      {isWithinWindow && (
        <div className="card-body">
          <p className="card-text">
            {useSentenceHighlight && sentences
              ? sentences.map((sentence, idx) => (
                  <span
                    key={idx}
                    className={`sentence-segment ${
                      idx === activeSentenceIndex ? 'is-focused' : 'is-dimmed'
                    }`}
                  >
                    {renderAnchorText(sentence, anchorMode)}
                    {idx < sentences.length - 1 ? ' ' : ''}
                  </span>
                ))
              : renderAnchorText(card.text, anchorMode)}
          </p>
          {card.index === 0 && total > 1 && (
            <div className="card-hint">
              {sentenceFocus
                ? 'Тапни або натисни Пробіл для наступного речення ↓'
                : 'Свайпни вгору або натисни Пробіл ↓'}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
