import { Check } from 'lucide-react';
import { useI18n } from '../../i18n';

interface DoneSlideProps {
  total: number;
  sessionThoughts: number;
  onViewThoughts: () => void;
  onRestart: () => void;
  onBackToLibrary: () => void;
}

export function DoneSlide({
  total,
  sessionThoughts,
  onViewThoughts,
  onRestart,
  onBackToLibrary
}: DoneSlideProps) {
  const i18n = useI18n();
  const t = i18n.m.reader.doneSlide;
  return (
    <article className="card-slide" data-index={total}>
      <div className="card-body card-done">
        <div className="done-badge" aria-hidden="true">
          <Check size={26} strokeWidth={2.2} />
        </div>
        <h2>{t.title}</h2>
        <p>{i18n.plural(t.summary, total)}</p>
        {sessionThoughts > 0 && (
          <p className="done-thoughts">
            <span>{i18n.plural(t.thoughts, sessionThoughts)}</span>{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onViewThoughts}>
              {t.viewThoughts}
            </button>
          </p>
        )}
        <div className="done-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRestart}
          >
            {t.restart}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onBackToLibrary}
          >
            {t.backToLibrary}
          </button>
        </div>
      </div>
    </article>
  );
}
