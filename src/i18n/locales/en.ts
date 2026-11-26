import type { Messages } from '../types';

export const en: Messages = {
  common: {
    untitled: 'Untitled',
    cards: {
      one: '{count} card',
      other: '{count} cards'
    }
  },
  achievements: {
    first_step: { title: 'First step', description: 'Finish your first text' },
    rhythm_50: { title: 'Finding the rhythm', description: 'Read 50 cards in total' },
    anchor_25: { title: 'Your anchor', description: 'Read 25 cards in Anchor mode' },
    zen_reader: { title: 'Quiet around you', description: 'Try Clean screen mode, with no extra buttons' },
    audio_listener: { title: 'Listener', description: 'Listen to 5 cards read aloud' },
    thought_hunter: { title: 'Thought catcher', description: 'Save 5 bookmarks in your texts' },
    no_rush: { title: 'No rush', description: 'Finish a session with the gentle focus timer' },
    bookworm_3: { title: 'A shelf of your own', description: 'Finish 3 texts' },
    rhythm_250: { title: 'Steady pace', description: 'Read 250 cards in total' },
    rhythm_1000: { title: 'Deep focus', description: 'Read 1,000 cards in total' }
  },
  achievementsSheet: {
    title: 'Progress & rewards',
    close: 'Close rewards',
    totalCards: 'Cards read',
    docsCompleted: 'Texts finished',
    rewards: 'Rewards',
    last7Days: 'Last 7 days',
    activityLabel: 'Activity over the last 7 days'
  },
  presets: {
    dyslexia: { label: 'Dyslexia', hint: 'Dyslexia-friendly font · wider spacing · Mint · Sentence focus' },
    tired_eyes: { label: 'Tired eyes', hint: 'Clear font · Dark · Anchor · 20-20-20' },
    book: { label: 'Book', hint: 'Book font · Paper · relaxed spacing' }
  },
  errors: {
    epub_invalid: 'This EPUB file looks damaged (container.xml is missing).',
    epub_no_manifest: 'This EPUB has no OPF manifest inside.',
    epub_no_text: 'Couldn’t find any text in this EPUB.',
    pdf_no_text: 'This PDF has no text layer. It may be scanned images.',
    backup_invalid: 'This isn’t a valid backup file.',
    backup_unsupported: 'Plyn doesn’t support this backup format.',
    url_invalid: 'Enter the full link, starting with https://',
    generic: 'Something went wrong. Please try again.',
    file_read: 'Couldn’t read the file.',
    backup_read: 'This isn’t a valid backup file.',
    article_read: 'Couldn’t get the article text.',
    extract: {
      method_not_allowed: 'This request method isn’t supported.',
      invalid_request: 'The request was malformed.',
      invalid_url: 'That doesn’t look like a valid link.',
      unsupported_protocol: 'Only http and https links are supported.',
      blocked_host: 'This address can’t be imported.',
      upstream_error: 'The site responded with an error ({status}).',
      no_article: 'Couldn’t find the article text. The site may need JavaScript or a login.',
      network_error: 'Couldn’t reach the site. Try copying the text in by hand.'
    }
  },
  export: {
    bookmarks: 'Bookmarks',
    card: 'Card {n}',
    note: 'Note'
  }
};
