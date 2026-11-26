// The named import keeps only `version` in the bundle, not the whole package.json.
import { version } from '../package.json';

/** The app version from package.json, shown in Settings so a reader can tell which build they have. */
export const APP_VERSION: string = version;
