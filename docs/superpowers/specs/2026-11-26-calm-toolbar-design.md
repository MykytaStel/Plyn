# v0.18 "Calm toolbar" — short design

Approved in chat on 2026-11-26 ("Yes, start v0.18").

## Why

- Settings (and the language switch) could only be opened from inside the reader. A new English-speaking user could not find the language until they opened a text.
- The reader toolbar had 7 icons plus the counter. On phones it overflowed (Settings was cut off at 320px) and it is a lot to scan for a reader who is easily overloaded.

## What

1. **Settings from the library.** The library header's theme button becomes a Settings button that opens the same `SettingsSheet`. Theme stays in the sheet.
   - Reader-only rows (focus timer, brown noise) depend on a reading session and hide when the sheet is opened from the library. Card length then just updates the setting.
2. **Sections in Settings:** quick presets, then "Text & look", "Reading", "Sound", "Language".
3. **"⋯" menu on phones (≤600px).** The toolbar keeps back, progress, Park a thought and Bookmark. Read aloud, Anchor, Sentence focus, Clean screen, Bookmarks list and Settings move into a tools sheet. Wider screens are unchanged.
   - Thought and Bookmark stay visible: they are "catch it in one tap" actions.
   - Each tool closes the sheet after one tap, so the reader returns to the text.
4. **No duplicate documents.** Starting a document whose text already exists in the library opens the existing one (with its progress) instead of creating a copy. Covers the sample and re-pasted articles.
5. **Font picker goes 2×2 on phones ≤400px** instead of truncating labels.

## Approaches considered

- Toolbar: hide icons by priority with CSS only (rejected: Bookmarks list and Clean screen would have no way in on phones); horizontal scroll (rejected: hidden controls, not calm); "⋯" sheet (chosen).
- Settings in the library: separate "app settings" page (rejected: two places for the same settings); the same sheet with reader-only rows hidden (chosen).

## Left to the builder

Icons, exact breakpoints and copy.
