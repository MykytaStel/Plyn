import type { UiLocale } from '../core/models/types';
import type { uk } from './locales/uk';

/** Defined in core (UserSettings needs it); core must not import i18n. */
export type Locale = UiLocale;

/** Plural forms keyed by Intl.PluralRules categories. `other` is mandatory. */
export interface PluralForms {
  one?: string;
  few?: string;
  many?: string;
  other: string;
}

type Widen<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralForms
    : { [K in keyof T]: Widen<T[K]> };

/** Shape every locale must match: `uk` is the source of truth. */
export type Messages = Widen<typeof uk>;
