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
    },
    thoughts: {
      one: '{count} thought',
      other: '{count} thoughts'
    }
  },
  meta: {
    title: 'Plyn — calm reading, one card at a time',
    description: 'Read long text in short cards, without eye strain or overload.'
  },
  sample: {
    title: 'Meet Plyn',
    text: `When a long wall of text opens up in front of you, your brain often gets tired before the first paragraph is over. Your eyes slip to the next line, and you end up reading the same sentence three times.

Plyn takes that overload away. Instead of an endless page, you see one short thought at a time — in a calm frame, with clear edges.

Swipe up on your phone, or press Space or the arrow keys on a computer, to move on. A soft line from the previous card sits at the top, so you never lose the thread.

In Settings, try the one-tap presets (Dyslexia, Tired eyes, Book) and offline brown noise. If an unrelated thought pops up while you read, tap the light bulb (or press N) to park it and keep going.

Double-tap any tricky word to hear it read aloud. You can also import .pdf, .epub, .fb2, .txt and .md files, or articles from a link.`
  },
  library: {
    update: {
      ready: 'A new version of Plyn is ready. It opens next time you come back.',
      apply: 'Update now'
    },
    mainLabel: 'Add text and library',
    thoughtsLabel: 'Thought Parking',
    thoughtsHint: 'Parked thoughts',
    helpLabel: 'How to use Plyn',
    helpHint: 'Quick start',
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
    backupHint: 'Save texts, bookmarks, thoughts and settings in one file',
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
      articleTruncated: 'Article “{title}” was very long — loaded the first part.',
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
      fb2Loading: 'Opening the FB2 book...',
      encodingUnsure: 'Imported “{name}”. If some letters look odd, save the file as UTF-8 and try again.',
      backupSaved: 'Library backup saved.',
      backupFailed: 'Couldn’t create a backup.',
      backupImported: 'Imported from backup: {texts}.',
      backupImportedWithThoughts: 'Imported from backup: {texts} and {thoughts}.',
      deleted: '“{title}” deleted.',
      undo: 'Undo',
      restored: '“{title}” is back.',
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
    bookmarks: 'Bookmarks: {count}',
    finished: 'Finished'
  },
  reader: {
    tools: {
      title: 'Reading tools',
      more: 'More tools',
      speak: 'Read aloud',
      stopSpeech: 'Stop reading aloud',
      anchor: 'Anchor',
      sentenceFocus: 'Sentence focus',
      zen: 'Clean screen',
      bookmarks: 'Bookmarks',
      contents: 'Contents and bookmarks',
      settings: 'Settings'
    },
    hintSentenceFocus: 'Tap or press Space for the next sentence · double-tap a word to hear it',
    hintSwipe: 'Swipe up or press Space · double-tap a word to hear it',
    mainLabel: 'Reading mode',
    progressHint: 'Tap to jump between cards',
    back: 'Back to library',
    library: 'Library',
    timeLeft: {
      min: '~{n} min',
      hour: '~{n} h',
      minPlain: '{n} min',
      hourPlain: '{n} h',
      toChapterEnd: 'About {time} left in this chapter',
      toTextEnd: 'About {time} left in this text'
    },
    counterHint: 'Jump between cards',
    done: 'Done',
    goalHint: 'Goal for this session',
    goal: 'Goal {count}/{target}',
    timerHint: 'Gentle focus timer',
    parkThought: 'Park a thought',
    parkThoughtHint: 'Thought Parking (N key)',
    stopSpeech: 'Stop reading aloud',
    speak: 'Read card aloud',
    speakHint: 'Read card aloud (S key)',
    bookmarkRemove: 'Remove bookmark',
    bookmarkAdd: 'Add bookmark',
    bookmarkHint: 'Bookmark (B key)',
    bookmarksList: 'Bookmarks list',
    bookmarksListHint: 'All bookmarks',
    contentsList: 'Contents and bookmarks',
    anchor: 'Anchor mode',
    anchorHint: 'Anchor mode (A key)',
    anchorButton: { bold: 'A', rest: 'b' },
    zen: 'Clean screen mode',
    zenHint: 'Clean screen (Z key)',
    settings: 'Display settings',
    settingsHint: 'Settings',
    scrubberLabel: 'Jump through the text',
    scrubberTitle: 'Quick jump',
    cardOf: 'Card {current} of {total}',
    cardsLabel: 'Text cards',
    navLabel: 'Card navigation',
    prev: 'Previous card',
    prevHint: 'Previous (↑)',
    next: 'Next card',
    nextHint: 'Next (Space or ↓)',
    doneSlide: {
      title: 'Text finished',
      summary: {
        one: 'You read {count} card at a calm pace.',
        other: 'You read {count} cards at a calm pace.'
      },
      restart: 'Read again',
      backToLibrary: 'Back to library'
    },
    toasts: {
      newReward: 'New reward: “{title}”',
      goalReached: {
        one: '{count} card done! Stop here or keep reading.',
        other: '{count} cards done! Stop here or keep reading.'
      },
      eyeBreak: 'Eye break (20-20-20): look at something far away for 10 seconds',
      timerDone: 'Focus time is up — take a break or keep reading',
      timerOn: 'Gentle {minutes}-minute timer on',
      noiseOn: 'Soft brown noise on',
      noiseOff: 'Brown noise off',
      zenOn: 'Clean screen — tap the card or press Z to bring the bar back',
      bookmarkAdded: 'Card bookmarked',
      bookmarkRemoved: 'Bookmark removed',
      chapterStop: 'New chapter: “{title}”. Turn read-aloud on again to keep listening',
      focusOn: 'Sentence focus on',
      focusOff: 'Sentence focus off',
      presetOn: '“{label}” mode on'
    }
  },
  bookmarks: {
    title: 'Bookmarks',
    exportHint: 'Export bookmarks and notes as Markdown',
    close: 'Close bookmarks',
    empty: 'No bookmarks yet. Tap the flag icon or press B while reading.',
    notePlaceholder: 'Add a short note...',
    contents: 'Contents',
    titleWithContents: 'Contents and bookmarks',
    closeWithContents: 'Close contents and bookmarks',
    view: 'What to show',
    current: 'You are here'
  },
  thoughts: {
    title: 'Thought Parking',
    subtitle: 'Jot down a stray thought in 2 seconds and get back to reading',
    close: 'Close Thought Parking',
    placeholder: 'For example: reply to that email, buy coffee...',
    save: 'Save',
    empty: 'Nothing here yet. When a stray thought pops up while you read, tap the light bulb or press N.',
    during: 'While reading:',
    delete: 'Delete thought'
  },
  settings: {
    sections: {
      appearance: 'Text & look',
      reading: 'Reading',
      sound: 'Sound',
      library: 'Your library'
    },
    storageUsage: 'Plyn takes about {size} on this device.',
    storageProtected: 'The browser promised to keep your library.',
    storageNotProtected: 'The browser may clear your library if space runs low. A backup keeps everything safe.',
    storageProtect: 'Ask the browser to keep it',
    storageDenied: 'The browser said no for now. A backup is always safe.',
    title: 'Reading comfort',
    close: 'Close settings',
    presets: 'One-tap presets',
    anchor: 'Anchor mode',
    anchorHint: 'Highlights the start of each word to give your eyes a place to land',
    sentenceFocus: 'Sentence focus',
    sentenceFocusHint: 'Gently highlights the current sentence (F key)',
    brownNoise: 'Brown noise (offline)',
    brownNoiseHint: 'A soft background sound that quiets stray thoughts',
    eyeBreak: 'Eye break (20-20-20)',
    eyeBreakHint: 'A quiet reminder to look away every 25 cards',
    keepScreenOn: 'Keep the screen on',
    keepScreenOnHint: 'While you read or listen. After 10 minutes without moving on, the screen may turn off again',
    autoAdvance: 'Keep listening (auto-advance)',
    autoAdvanceHint: 'Read-aloud moves to the next card on its own',
    ttsRate: 'Read-aloud speed',
    wordHighlight: 'Highlight the spoken word',
    wordHighlightHint: 'Works with most system voices',
    speechUnavailable: 'This browser can’t read aloud',
    voiceUk: 'Voice: Ukrainian',
    voiceEn: 'Voice: English',
    voiceDefault: 'Browser default',
    voiceNetwork: '{name} · needs internet',
    // The sample follows the voice's language, not the UI language.
    voiceSamples: { uk: 'Привіт! Так звучатиме твій текст.', en: 'Hi! This is how your text will sound.' },
    font: 'Font',
    fontChoice: 'Choose a font',
    fonts: { sans: 'Regular', hyperlegible: 'Easy on eyes', dyslexic: 'Dyslexia', serif: 'Book' },
    spacing: 'Letter and word spacing',
    spacings: { normal: 'Regular', wide: 'Wider', extra: 'Dyslexia' },
    width: 'Column width',
    widths: { narrow: 'Narrow column', standard: 'Standard' },
    theme: 'Theme',
    themeChoice: 'Choose a theme',
    themes: { dark: 'Dark', paper: 'Paper', gray: 'Gray', mint: 'Mint' },
    cardLength: 'Card length',
    lengths: { short: 'Short', medium: 'Medium', long: 'Longer' },
    timer: 'Focus timer',
    timerHint: 'no seconds, no pressure',
    timerOff: 'Off',
    minutesShort: '{minutes} min',
    fontSize: 'Font size',
    lineHeight: 'Line spacing',
    version: 'Plyn, version {version}',
    shortcuts: {
      keyboard: 'Keyboard:',
      next: 'next',
      anchor: 'anchor',
      focus: 'focus',
      thought: 'thought',
      speech: 'read aloud',
      zen: 'clean screen'
    }
  },
  onboarding: {
    stepOf: 'Step {step} of {total}',
    skipLabel: 'Skip the intro',
    skip: 'Skip',
    next: 'Next',
    ownText: 'Use my own text',
    trySample: 'Try the sample',
    demoPreview: 'Anchor mode highlights the start of every word, so your eyes don’t slide off the line.',
    step1: {
      kicker: 'Welcome',
      title: 'Read without walls of text',
      before: 'Plyn breaks long articles, notes and',
      after: 'books into short cards. Your brain sees clear edges and real progress — and your eyes get much less tired.'
    },
    step2: {
      kicker: 'Make it yours',
      title: 'Calm themes and Anchor',
      anchorOn: 'Try Anchor',
      anchorOff: 'Turn off Anchor'
    },
    step3: {
      kicker: 'Ready to go',
      title: 'Swipe or press Space',
      before: 'On a phone, swipe cards up. On a computer, press',
      after: 'or the arrow keys. Settings also have a dyslexia font, Sentence focus, read-aloud and Clean screen.'
    }
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
    fb2_invalid: 'This FB2 file looks damaged.',
    fb2_no_text: 'Couldn’t find any text in this FB2.',
    pdf_no_text: 'This PDF has no text layer. It may be scanned images.',
    backup_invalid: 'This isn’t a valid backup file.',
    backup_unsupported: 'Plyn doesn’t support this backup format.',
    url_invalid: 'Enter the full link, starting with https://',
    offline: 'You’re offline. Importing from a link needs the internet; reading works without it.',
    app_updated: 'Plyn has been updated. Reload the page and it will open.',
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
      too_many_redirects: 'This link redirected too many times. Try opening it in your browser and copying the text.',
      timeout: 'The site took too long to respond. Try again or copy the text in by hand.',
      response_too_large: 'This page is too large to import automatically. Try copying the article text.',
      rate_limited: 'Too many link imports in a short time. Wait a moment and try again.',
      login_required: 'This site asks for a login or subscription. Copy the text in by hand to read it in Plyn.',
      js_required: 'This page needs JavaScript to show its text. Copy the article from your browser instead.',
      upstream_error: 'The site responded with an error ({status}).',
      no_article: 'Couldn’t find the article text. The site may need JavaScript or a login.',
      network_error: 'Couldn’t reach the site. Try copying the text in by hand.'
    }
  },
  errorScreen: {
    title: 'Something went wrong',
    body: 'Your texts are safe on this device. You can save a backup or reload Plyn.',
    saveBackup: 'Save a backup',
    reload: 'Reload',
    backupSaved: 'Backup saved.',
    backupFailed: 'Couldn’t create a backup. Try reloading.'
  },
  export: {
    bookmarks: 'Bookmarks',
    card: 'Card {n}',
    note: 'Note'
  }
};
