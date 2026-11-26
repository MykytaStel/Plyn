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
  }
};
