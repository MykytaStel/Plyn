import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeSpeech, voice, type FakeSpeech } from '../../../test/fakeSpeech';
import {
  NO_WORDS_TIMEOUT_MS,
  listVoices,
  onVoicesChanged,
  queueCardText,
  speakCardText,
  speakPreview,
  speakSingleWord,
  stopSpeaking
} from './tts';

const UK = 'Ранок був тихий — і ясний.';
const EN = 'The morning was quiet.';
let fake: FakeSpeech;
let voiceSeq = 0;

beforeEach(() => {
  vi.useFakeTimers();
  voiceSeq += 1;
  // A fresh voice id per test: "no word positions" marks last for the session.
  fake = installFakeSpeech([
    voice(`lesya-${voiceSeq}`, 'uk-UA'),
    voice(`daniel-${voiceSeq}`, 'en-GB', false),
    voice(`anna-${voiceSeq}`, 'de-DE')
  ]);
});
afterEach(() => {
  stopSpeaking();
  fake.uninstall();
  vi.useRealTimers();
});

describe('speakCardText', () => {
  it('speaks with the content language tag and the chosen voice', () => {
    speakCardText(UK, { voiceURI: `lesya-${voiceSeq}`, rate: 1.25 });
    const u = fake.spoken[0];
    expect(u.lang).toBe('uk-UA');
    expect(u.rate).toBe(1.25);
    expect(u.voice?.voiceURI).toBe(`lesya-${voiceSeq}`);
    speakCardText(EN);
    expect(fake.spoken[1].lang).toBe('en-US');
  });

  it('falls back to the default voice when the saved one is missing', () => {
    expect(() => speakCardText(UK, { voiceURI: 'from-another-device' })).not.toThrow();
    expect(fake.spoken[0].voice).toBeNull();
  });

  it('reports word ranges and skips punctuation', () => {
    const onWord = vi.fn();
    speakCardText(UK, { onWord });
    fake.start();
    fake.word(0, 5);
    fake.word(UK.indexOf('—'), 1);
    fake.word(0, 0, 'sentence');
    expect(onWord).toHaveBeenCalledTimes(1);
    expect(onWord).toHaveBeenCalledWith({ start: 0, end: 5 });
  });

  it('ignores events from a cancelled session', () => {
    const a = { onComplete: vi.fn(), onWord: vi.fn() };
    speakCardText(UK, a);
    const first = fake.spoken[0];
    speakCardText(EN);
    first.onboundary?.({ name: 'word', charIndex: 0, charLength: 5 });
    first.onend?.(new Event('end'));
    expect(a.onComplete).not.toHaveBeenCalled();
    expect(a.onWord).not.toHaveBeenCalled();
  });
});

describe('queueCardText', () => {
  it('queues the next card in the same session without cancel', () => {
    const b = { onStart: vi.fn(), onComplete: vi.fn() };
    speakCardText(UK);
    const cancels = fake.cancelCount;
    queueCardText(EN, b);
    expect(fake.spoken).toHaveLength(2);
    expect(fake.cancelCount).toBe(cancels);
    fake.start();
    fake.end();
    fake.start();
    expect(b.onStart).toHaveBeenCalledTimes(1);
    fake.end();
    expect(b.onComplete).toHaveBeenCalledTimes(1);
  });

  it('stopSpeaking drops queued cards', () => {
    const b = { onStart: vi.fn(), onComplete: vi.fn(), onStop: vi.fn() };
    speakCardText(UK);
    queueCardText(EN, b);
    const queued = fake.spoken[1];
    stopSpeaking();
    queued.onstart?.(new Event('start'));
    queued.onend?.(new Event('end'));
    expect(b.onStart).not.toHaveBeenCalled();
    expect(b.onComplete).not.toHaveBeenCalled();
  });
});

describe('no word positions (EXP-02: 3 s rule)', () => {
  it('calls onNoWords after 3000 ms without word events and stays silent for that voice', () => {
    const lesya = `lesya-${voiceSeq}`;
    const first = { onWord: vi.fn(), onNoWords: vi.fn() };
    speakCardText(UK, { voiceURI: lesya, ...first });
    fake.start();
    vi.advanceTimersByTime(NO_WORDS_TIMEOUT_MS);
    expect(first.onNoWords).toHaveBeenCalledTimes(1);

    const second = { onWord: vi.fn(), onNoWords: vi.fn() };
    speakCardText(UK, { voiceURI: lesya, ...second });
    fake.start();
    fake.word(0, 5);
    expect(second.onWord).not.toHaveBeenCalled();

    const other = { onWord: vi.fn() };
    speakCardText(UK, { ...other });
    fake.start();
    fake.word(0, 5);
    expect(other.onWord).toHaveBeenCalledTimes(1);
  });

  it('does not call onNoWords when a word arrives at 2999 ms', () => {
    const o = { onWord: vi.fn(), onNoWords: vi.fn() };
    speakCardText(UK, o);
    fake.start();
    vi.advanceTimersByTime(NO_WORDS_TIMEOUT_MS - 1);
    fake.word(0, 5);
    vi.advanceTimersByTime(10_000);
    expect(o.onNoWords).not.toHaveBeenCalled();
  });

  it('does not time out a cancelled utterance', () => {
    const o = { onWord: vi.fn(), onNoWords: vi.fn() };
    speakCardText(UK, o);
    fake.start();
    stopSpeaking();
    vi.advanceTimersByTime(10_000);
    expect(o.onNoWords).not.toHaveBeenCalled();
  });
});

describe('voices', () => {
  it('lists voices by language and marks network voices', () => {
    expect(listVoices('en')).toEqual([{ uri: `daniel-${voiceSeq}`, name: `daniel-${voiceSeq}`, local: false }]);
    expect(listVoices('uk').map((v) => v.uri)).toEqual([`lesya-${voiceSeq}`]);
  });

  it('reads Android-style language tags', () => {
    fake.setVoices([voice('x', 'uk_UA')]);
    expect(listVoices('uk').map((v) => v.uri)).toEqual(['x']);
  });

  it('onVoicesChanged notifies and unsubscribes', () => {
    const cb = vi.fn();
    const off = onVoicesChanged(cb);
    fake.setVoices([]);
    off();
    fake.setVoices([]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('speaks a single word and a preview in the chosen voice', () => {
    speakSingleWord('тихий', `lesya-${voiceSeq}`);
    expect(fake.spoken[0].voice?.voiceURI).toBe(`lesya-${voiceSeq}`);
    speakPreview('Hello there.', 'en', `daniel-${voiceSeq}`);
    expect(fake.spoken[1].lang).toBe('en-US');
    expect(fake.spoken[1].voice?.voiceURI).toBe(`daniel-${voiceSeq}`);
  });
});
