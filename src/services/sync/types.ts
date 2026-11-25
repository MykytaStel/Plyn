import type { PlynDocument } from '../../core/models/types';

/**
 * Контракт синхронізації для майбутнього підключення Cloudflare Workers + D1 / Supabase
 * та спільного API з нативними iOS / Android застосунками.
 */
export interface SyncAdapter {
  pullDocuments(sinceTimestamp?: number): Promise<PlynDocument[]>;
  pushDocument(doc: PlynDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}
