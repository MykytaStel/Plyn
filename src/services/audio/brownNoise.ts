/**
 * Офлайн-генератор м'якого коричневого шуму (Brown Noise) на Web Audio API.
 * 0 КБ аудіофайлів, працює 100% офлайн, допомагає приглушити фоновий шум думок при РДУГ.
 */

let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let isPlayingState = false;

export function isBrownNoisePlaying(): boolean {
  return isPlayingState;
}

export function startBrownNoise(volume = 0.14): boolean {
  if (typeof window === 'undefined') return false;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return false;

  if (isPlayingState) return true;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    // Генеруємо 4-секундний безшовний буфер теплого коричневого шуму
    const bufferSize = audioCtx.sampleRate * 4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 2.8;
    }

    // Плавне зшивання кінців буфера, щоб не було клацання на циклі
    const fadeSamples = Math.min(2000, Math.floor(bufferSize * 0.05));
    for (let i = 0; i < fadeSamples; i += 1) {
      const t = i / fadeSamples;
      const tailIdx = bufferSize - fadeSamples + i;
      data[tailIdx] = data[tailIdx] * (1 - t) + data[i] * t;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.6);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();

    sourceNode = source;
    gainNode = gain;
    isPlayingState = true;
    return true;
  } catch {
    return false;
  }
}

export function stopBrownNoise(): void {
  if (!isPlayingState) return;
  isPlayingState = false;

  try {
    if (audioCtx && gainNode && sourceNode) {
      const now = audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      const nodeToStop = sourceNode;
      window.setTimeout(() => {
        try {
          nodeToStop.stop();
          nodeToStop.disconnect();
        } catch {
          // Ігноруємо
        }
      }, 280);
    }
  } catch {
    // Ігноруємо
  } finally {
    sourceNode = null;
    gainNode = null;
  }
}
