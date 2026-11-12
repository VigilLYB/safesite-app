/** Voice notes are 16 kHz mono 16-bit PCM WAV, 60 s at most (guide §2.6). */
export const VOICE_RATE = 16_000;
export const VOICE_MAX_SECONDS = 60;

/** Average-downsample mono samples from `fromRate` to `toRate`. */
export function downsample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (toRate >= fromRate) return samples;
  const ratio = fromRate / toRate;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += samples[j] ?? 0;
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

/** A complete RIFF/WAVE file: 44-byte header + little-endian 16-bit PCM. */
export function encodeWav(samples: Float32Array, sampleRate: number = VOICE_RATE): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buffer;
}

/** Read back the header fields a server would check. */
export function inspectWav(buffer: ArrayBuffer): {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  seconds: number;
} | null {
  if (buffer.byteLength < 44) return null;
  const view = new DataView(buffer);
  const tag = (offset: number) =>
    String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(offset + i)));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataBytes = view.getUint32(40, true);
  return {
    sampleRate,
    channels,
    bitsPerSample,
    seconds: dataBytes / (sampleRate * channels * (bitsPerSample / 8)),
  };
}
