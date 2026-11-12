import { useCallback, useEffect, useRef, useState } from "react";
import { clock } from "@/lib/clock";
import { downsample, encodeWav, VOICE_RATE } from "../lib/wav";
import { MAX_RECORDING_MS, type VoiceRecorder } from "./voice-types";

interface Capture {
  context: AudioContext;
  stream: MediaStream;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
}

/**
 * Web: MediaRecorder produces WebM/Opus (Chrome) or MP4/AAC (Safari), which the server rejects.
 * Capture raw PCM with the Web Audio API instead, downsample to 16 kHz and write the WAV header
 * ourselves (guide §2.6).
 */
export function useVoiceRecorder(): VoiceRecorder {
  const capture = useRef<Capture | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const [uri, setUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  const stop = useCallback(async () => {
    const active = capture.current;
    capture.current = null;
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
    setRecording(false);
    if (!active) return;
    active.processor.disconnect();
    active.stream.getTracks().forEach((track) => track.stop());
    const total = active.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of active.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const wav = encodeWav(downsample(merged, active.context.sampleRate, VOICE_RATE), VOICE_RATE);
    await active.context.close();
    setUri(URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("This browser can't record audio. Type what you saw.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      processor.onaudioprocess = (event) => {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(context.destination);
      capture.current = { context, stream, processor, chunks };
      startedAt.current = clock.nowMs();
      setDurationMs(0);
      setRecording(true);
      tick.current = setInterval(() => setDurationMs(clock.nowMs() - startedAt.current), 250);
      timer.current = setTimeout(() => void stop(), MAX_RECORDING_MS);
    } catch {
      setError("Microphone access is off. Allow it in the browser, or type what you saw.");
    }
  }, [stop, supported]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (tick.current) clearInterval(tick.current);
      capture.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return {
    supported,
    uri,
    contentType: "audio/wav",
    isRecording: recording,
    durationMs,
    error,
    start,
    stop,
    clear: () => setUri(null),
  };
}
