import { planPhoto } from "./photo-rules";
import { downsample, encodeWav, inspectWav } from "./wav";

describe("photo rules", () => {
  it("rejects under 64 px, downsizes over 4096, leaves the rest", () => {
    expect(planPhoto({ width: 63, height: 2000 }).ok).toBe(false);
    expect(planPhoto({ width: 8000, height: 6000 })).toEqual({ ok: true, resize: { width: 4096 } });
    expect(planPhoto({ width: 3000, height: 9000 })).toEqual({
      ok: true,
      resize: { height: 4096 },
    });
    expect(planPhoto({ width: 1200, height: 900 })).toEqual({ ok: true, resize: null });
  });
});

describe("WAV", () => {
  it("writes a 16 kHz mono 16-bit PCM file the server accepts", () => {
    const samples = new Float32Array(16000).fill(0.25);
    const wav = encodeWav(samples, 16000);
    expect(wav.byteLength).toBe(44 + 32000);
    expect(inspectWav(wav)).toEqual({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      seconds: 1,
    });
  });
  it("downsamples 48 kHz to 16 kHz", () => {
    expect(downsample(new Float32Array(48000), 48000, 16000)).toHaveLength(16000);
  });
  it("60 s stays under the 4 MB upload limit", () => {
    expect(encodeWav(new Float32Array(16000 * 60), 16000).byteLength).toBeLessThan(4 * 1024 * 1024);
  });
});
