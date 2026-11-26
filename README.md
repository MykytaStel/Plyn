# Plyn

**Calm card-by-card reading for ADHD and dyslexia.**

Plyn takes a long text (pasted text, a web article, a `.pdf` or an `.epub`) and splits it into short cards of one or two sentences. You read one card at a time, with clear boundaries and visible progress, instead of facing a wall of text.

Live: <https://plyn.mykytastelmashenko.workers.dev/>

The interface is in Ukrainian. English is planned.

## Features

- **Card reading** with swipe, Space or arrow keys. Three card lengths. Progress survives changing the card length.
- **Comfort presets** in one tap: fonts for dyslexia, letter and word spacing, narrow column, calm themes (dark, paper, gray, mint).
- **Focus aids:** sentence focus, "Anchor" (bold word starts), Zen mode, focus timer, 20-20-20 eye-break reminder, offline brown noise.
- **Listening:** text-to-speech for the current card with auto-advance, and double-tap a word to hear it.
- **Thought Parking:** jot down a distracting thought without leaving the text.
- **Library:** bookmarks with notes, Markdown export, search and filters, a 7-day reading rhythm, JSON backup and restore.
- **Offline-first PWA:** installable, works without a network, and accepts shared text and links through the Web Share Target. Your texts stay on your device.

## Fonts

Each script gets a font that actually has its glyphs:

- **Fixel Text** (MacPaw, OFL 1.1) is the default UI and reading font, Latin and Cyrillic.
- **Andika** (SIL) is used for Cyrillic in the dyslexia preset.
- **OpenDyslexic** and **Atkinson Hyperlegible** are used for Latin text.
- **Literata** is the book-style serif.

## Development

```bash
npm ci
npm run dev     # http://localhost:5173
npm test
npm run build
```

Stack: React 19, TypeScript, Vite, Zustand, Dexie (IndexedDB), vite-plugin-pwa, and a Cloudflare Worker for hosting and article extraction. Pushes to `main` deploy automatically through GitHub Actions.

Contributors and AI agents: read [AGENTS.md](AGENTS.md) first.
