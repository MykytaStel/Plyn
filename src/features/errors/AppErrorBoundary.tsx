import { Component, type ErrorInfo, type ReactNode } from 'react';
import { currentI18n } from '../../i18n';
import { saveBackupFile } from '../../services/storage/backupFile';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  backupNote: string;
}

/**
 * If rendering fails, the reader sees a calm screen instead of a blank page,
 * and can still save their library (IMP-07). Copy comes from currentI18n(),
 * and the backup depends only on IndexedDB, not on React state.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, backupNote: '' };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Plyn crashed', error, info.componentStack);
  }

  private handleBackup = async () => {
    const t = currentI18n().m.errorScreen;
    try {
      const result = await saveBackupFile();
      if (result !== 'cancelled') this.setState({ backupNote: t.backupSaved });
    } catch {
      this.setState({ backupNote: t.backupFailed });
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const t = currentI18n().m.errorScreen;
    return (
      <main className="error-screen">
        <h1>{t.title}</h1>
        <p>{t.body}</p>
        <div className="error-screen-actions">
          <button type="button" className="btn btn-primary" onClick={() => void this.handleBackup()}>
            {t.saveBackup}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
            {t.reload}
          </button>
        </div>
        <p className="error-screen-note" role="status">
          {this.state.backupNote}
        </p>
      </main>
    );
  }
}
