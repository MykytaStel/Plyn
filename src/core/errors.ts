export type PlynErrorCode =
  | 'epub_invalid'
  | 'epub_no_manifest'
  | 'epub_no_text'
  | 'pdf_no_text'
  | 'backup_invalid'
  | 'backup_unsupported'
  | 'url_invalid'
  | 'offline'
  | 'app_updated';

/**
 * A user-facing failure with a stable code. Core never carries copy:
 * the UI maps `code` to text via src/i18n (errorMessage).
 */
export class PlynError extends Error {
  readonly code: PlynErrorCode;

  constructor(code: PlynErrorCode) {
    super(code);
    this.name = 'PlynError';
    this.code = code;
  }
}
