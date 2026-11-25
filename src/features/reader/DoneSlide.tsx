import { Check } from 'lucide-react';

interface DoneSlideProps {
  total: number;
  onRestart: () => void;
  onBackToLibrary: () => void;
}

function pluralizeCards(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'картку';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'картки';
  return 'карток';
}

export function DoneSlide({
  total,
  onRestart,
  onBackToLibrary
}: DoneSlideProps) {
  return (
    <article className="card-slide" data-index={total}>
      <div className="card-body card-done">
        <div className="done-badge" aria-hidden="true">
          <Check size={26} strokeWidth={2.2} />
        </div>
        <h2>Текст прочитано</h2>
        <p>
          Пройдено {total} {pluralizeCards(total)} у спокійному темпі.
        </p>
        <div className="done-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRestart}
          >
            Читати знову
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onBackToLibrary}
          >
            До бібліотеки
          </button>
        </div>
      </div>
    </article>
  );
}
