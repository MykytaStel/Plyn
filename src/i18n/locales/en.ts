import type { Messages } from '../types';

export const en: Messages = {
  common: {
    untitled: 'Untitled',
    cancel: 'Cancel',
    minutesApprox: '~{minutes} min',
    cards: {
      one: '{count} card',
      other: '{count} cards'
    },
    texts: {
      one: '{count} text',
      other: '{count} texts'
    }
  },
  sample: {
    title: 'Meet Plyn',
    text: `When a long wall of text opens up in front of you, your brain often gets tired before the first paragraph is over. Your eyes slip to the next line, and you end up reading the same sentence three times.

Plyn takes that overload away. Instead of an endless page, you see one short thought at a time — in a calm frame, with clear edges.

Swipe up on your phone, or press Space or the arrow keys on a computer, to move on. A soft line from the previous card sits at the top, so you never lose the thread.

In Settings, try the one-tap presets (Dyslexia, Tired eyes, Book) and offline brown noise. If an unrelated thought pops up while you read, tap the light bulb (or press N) to park it and keep going.

Double-tap any tricky word to hear it read aloud. You can also import .pdf, .epub, .txt and .md files, or articles from a link.`
  },
  library: {
    mainLabel: 'Add text and library',
    thoughtsLabel: 'Thought Parking',
    thoughtsHint: 'Parked thoughts',
    helpLabel: 'How to use Plyn',
    helpHint: 'Quick start',
    changeTheme: 'Change theme',
    heroTitle: 'Read at your own pace',
    heroText: 'Paste text, an article link or a .pdf / .epub file — Plyn turns it into short cards.',
    microStartLabel: 'Easy start',
    microStartAction: 'Read 5 cards',
    collapseEditor: 'Hide the add form',
    expandEditor: 'Add text, .pdf, .epub or a link',
    urlLoad: 'Load',
    titleLabel: 'Title (optional)',
    titlePlaceholder: 'Title (optional — we’ll make one up)',
    textLabel: 'Text to read',
    textPlaceholder: 'Paste an article, your notes or a book chapter...',
    fromClipboard: 'Paste',
    fromUrl: 'From link',
    sample: 'Sample',
    characters: {
      one: '{count} character',
      other: '{count} characters'
    },
    start: 'Start reading',
    libraryTitle: 'My library',
    backup: 'Backup',
    backupHint: 'Export your library and rewards as JSON',
    import: 'Import',
    importHint: 'Restore from a JSON backup',
    filterLabel: 'Library filter',
    filters: {
      all: 'All',
      active: 'In progress',
      bookmarked: 'Bookmarked',
      completed: 'Finished'
    },
    searchPlaceholder: 'Search your library...',
    filterEmpty: 'Nothing here for this filter yet.',
    feedback: {
      sharedArticleLoading: 'Loading the shared article...',
      articleLoading: 'Loading the article...',
      articleLoaded: 'Article “{title}” loaded.',
      sharedArticleFailed: 'Couldn’t get the page — check the link above.',
      sharedText: 'Text received from Share.',
      pasteManually: 'Paste the text into the field above (Cmd+V or long-press).',
      clipboardEmpty: 'The clipboard is empty.',
      clipboardPasted: 'Text pasted from the clipboard.',
      clipboardDenied: 'The browser blocked access — paste the text into the field above.',
      epubLoading: 'Unpacking the EPUB book...',
      epubLoaded: 'Book “{title}” loaded. Tap “Start reading”.',
      pdfLoading: 'Reading the PDF...',
      pdfLoaded: 'PDF “{title}” loaded. Tap “Start reading”.',
      fileEmpty: 'The file is empty.',
      fileImported: 'Imported “{name}”. Tap “Start reading”.',
      backupSaved: 'Library backup saved.',
      backupFailed: 'Couldn’t create a backup.',
      backupImported: 'Imported from backup: {texts}.',
      sampleLoaded: 'Sample loaded. Tap “Start reading”.'
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
  libraryCard: {
    open: 'Open {title}',
    saveTitle: 'Save title',
    rename: 'Rename {title}',
    renameHint: 'Rename',
    delete: 'Delete {title}',
    deleteHint: 'Remove from library',
    progress: 'Card {current} of {total} · {percent}%',
    bookmarks: 'Bookmarks: {count}'
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
