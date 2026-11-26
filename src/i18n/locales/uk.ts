/**
 * Українські тексти інтерфейсу — джерело правди для форми словника.
 * Кожен ключ тут має бути і в en.ts (це перевіряє TypeScript).
 */
export const uk = {
  common: {
    untitled: 'Без назви',
    cards: {
      one: '{count} картка',
      few: '{count} картки',
      many: '{count} карток',
      other: '{count} картки'
    }
  },
  achievements: {
    first_step: { title: 'Перший крок', description: 'Дочитати перший текст до кінця' },
    rhythm_50: { title: 'У ритмі', description: 'Прочитати 50 карток сумарно' },
    anchor_25: { title: 'Свій якір', description: 'Прочитати 25 карток у режимі «Якір»' },
    zen_reader: { title: 'Тиша навколо', description: 'Спробувати режим «Чистий екран» без зайвих кнопок' },
    audio_listener: { title: 'Слухач', description: 'Прослухати 5 карток через озвучку' },
    thought_hunter: { title: 'Мисливець за думками', description: 'Зберегти 5 закладок у текстах' },
    no_rush: { title: 'Без поспіху', description: 'Завершити сесію з м’яким таймером фокусу' },
    bookworm_3: { title: 'Власна полиця', description: 'Дочитати 3 тексти до кінця' },
    rhythm_250: { title: 'Спокійний темп', description: 'Прочитати 250 карток сумарно' },
    rhythm_1000: { title: 'Глибокий фокус', description: 'Прочитати 1 000 карток сумарно' }
  },
  achievementsSheet: {
    title: 'Прогрес і нагороди',
    close: 'Закрити нагороди',
    totalCards: 'Карток усього',
    docsCompleted: 'Текстів завершено',
    rewards: 'Нагород',
    last7Days: 'Останні 7 днів',
    activityLabel: 'Активність за 7 днів'
  },
  presets: {
    dyslexia: { label: 'Дислексія', hint: 'Шрифт для дислексії · ширший інтервал · М’ята · Фокус-речення' },
    tired_eyes: { label: 'Втомлені очі', hint: 'Чіткий шрифт · Темна · Якір · 20-20-20' },
    book: { label: 'Книга', hint: 'Книжковий шрифт · Паперова · спокійний інтервал' }
  }
} as const;
