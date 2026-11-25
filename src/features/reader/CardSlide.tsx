import { useMemo } from 'react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import type { ReadingCard } from '../../core/models/types';

interface CardSlideProps {
  card: ReadingCard;
  total: number;
  anchorMode: boolean;
}

export function CardSlide({ card, total, anchorMode }: CardSlideProps) {
  const tokens = useMemo(
    () => (anchorMode ? tokenizeWithAnchors(card.text) : null),
    [anchorMode, card.text]
  );

  return (
    <article className="card-slide" data-index={card.index}>
      <div className="card-body">
        <p className="card-text">
          {tokens
            ? tokens.map((token, i) =>
                token.type === 'word' ? (
                  <span key={i}>
                    <span className="anchor-lead">{token.lead}</span>
                    {token.rest}
                  </span>
                ) : (
                  <span key={i}>{token.value}</span>
                )
              )
            : card.text}
        </p>
        {card.index === 0 && total > 1 && (
          <div className="card-hint">Свайпни вгору або натисни Пробіл ↓</div>
        )}
      </div>
    </article>
  );
}
