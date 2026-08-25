import EchoAura from "@/components/EchoAura";
import EchoEqualizer from "@/components/EchoEqualizer";
import { Mic, MicOff, Play, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type EchoState =
  | "idle"
  | "permission"
  | "listening"
  | "recording"
  | "playing"
  | "error";

const SHORT_SILENCE_MS = 600;
const MAX_PAST_ECHOES = 12;
const FFT_SIZE = 512;
const EQ_BINS = 64;
const NOISE_GATE_LEVELS = [0.02, 0.04, 0.06, 0.09, 0.13] as const;
const DEFAULT_NOISE_GATE_INDEX = 2;

type VoiceProfile = {
  playbackRate: number;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    Q?: number;
    gain?: number;
  };
  distortion?: number;
  reverbAmount?: number;
};

type CharacterDef = {
  emoji: string;
  name: string;
  hue: number;
  voice: VoiceProfile;
};

type VisualMode = "aura" | "equalizer";

const CHARACTERS: readonly CharacterDef[] = [
  {
    emoji: "🦜",
    name: "Loro",
    hue: 0.12,
    voice: {
      playbackRate: 1.55,
      filter: { type: "highpass", frequency: 500 },
    },
  },
  {
    emoji: "🐸",
    name: "Rana",
    hue: 0.3,
    voice: {
      playbackRate: 0.7,
      filter: { type: "lowpass", frequency: 1300 },
      distortion: 0.4,
    },
  },
  {
    emoji: "🦊",
    name: "Zorro",
    hue: 0.04,
    voice: {
      playbackRate: 1.15,
      filter: { type: "bandpass", frequency: 1500, Q: 0.6 },
    },
  },
  {
    emoji: "🐵",
    name: "Mono",
    hue: 0.08,
    voice: {
      playbackRate: 1.85,
      filter: { type: "lowpass", frequency: 4000 },
    },
  },
  {
    emoji: "🐼",
    name: "Panda",
    hue: 0.58,
    voice: {
      playbackRate: 0.78,
      filter: { type: "lowpass", frequency: 2200 },
    },
  },
  {
    emoji: "🦄",
    name: "Unicornio",
    hue: 0.85,
    voice: {
      playbackRate: 1.3,
      filter: { type: "highshelf", frequency: 2000, gain: 8 },
      reverbAmount: 0.55,
    },
  },
] as const;

type PastEcho = {
  id: number;
  segments: Blob[];
  durationMs: number;
  createdAt: number;
};

function getRMS(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buffer.length);
}

function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k = amount * 100;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] =
      ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function makeReverbBuffer(
  ctx: AudioContext,
  seconds: number,
  decay: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function playSegmentsWithVoice(
  ctx: AudioContext,
  segments: Blob[],
  profile: VoiceProfile,
  onEnd: () => void
): () => void {
  let cancelled = false;
  let currentSource: AudioBufferSourceNode | null = null;
  const reverbBuffer =
    profile.reverbAmount && profile.reverbAmount > 0
      ? makeReverbBuffer(ctx, 1.5, 2.5)
      : null;

  const playOne = async (i: number) => {
    if (cancelled) return;
    if (i >= segments.length) {
      onEnd();
      return;
    }
    try {
      const segment = segments[i]!;
      const ab = await segment.arrayBuffer();
      if (cancelled) return;
      const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
      if (cancelled) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = profile.playbackRate;

      let node: AudioNode = source;
      if (profile.filter) {
        const f = ctx.createBiquadFilter();
        f.type = profile.filter.type;
        f.frequency.value = profile.filter.frequency;
        if (profile.filter.Q !== undefined) f.Q.value = profile.filter.Q;
        if (profile.filter.gain !== undefined) f.gain.value = profile.filter.gain;
        node.connect(f);
        node = f;
      }
      if (profile.distortion && profile.distortion > 0) {
        const w = ctx.createWaveShaper();
        w.curve = makeDistortionCurve(profile.distortion);
        w.oversample = "4x";
        node.connect(w);
        node = w;
      }
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1.0;
      node.connect(dryGain);
      dryGain.connect(ctx.destination);

      if (reverbBuffer && profile.reverbAmount) {
        const wet = ctx.createGain();
        wet.gain.value = profile.reverbAmount;
        const convolver = ctx.createConvolver();
        convolver.buffer = reverbBuffer;
        node.connect(convolver);
        convolver.connect(wet);
        wet.connect(ctx.destination);
      }

      currentSource = source;
      source.onended = () => {
        currentSource = null;
        playOne(i + 1);
      };
      source.start(0);
    } catch {
      playOne(i + 1);
    }
  };

  playOne(0);

  return () => {
    cancelled = true;
    if (currentSource) {
      try {
        currentSource.stop();
      } catch {}
      currentSource = null;
    }
  };
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 100) / 10);
  return `${total.toFixed(1)}s`;
}

function PastEchoItem({
  echo,
  index,
  isPlayingThis,
  onPlay,
  onStop,
  onDelete,
}: {
  echo: PastEcho;
  index: number;
  isPlayingThis: boolean;
  onPlay: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="flex items-center gap-2 rounded-full bg-white/85 px-2 py-1.5 shadow"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={isPlayingThis ? onStop : onPlay}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ${
          isPlayingThis
            ? "bg-rose-500"
            : "bg-gradient-to-br from-purple-500 to-pink-500"
        }`}
        aria-label={isPlayingThis ? "Parar eco" : "Reproducir eco"}
      >
        {isPlayingThis ? (
          <span className="block h-4 w-4 rounded-sm bg-white" />
        ) : (
          <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
        )}
      </motion.button>
      <div className="flex-1 text-left">
        <div className="text-sm font-bold text-purple-800">
          Eco #{index + 1}
        </div>
        <div className="text-xs text-purple-600">
          {formatDuration(echo.durationMs)}
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDelete}
        className="flex h-9 w-9 items-center justify-center rounded-full text-purple-500 hover:bg-rose-100 hover:text-rose-600"
        aria-label="Borrar eco"
      >
        <Trash2 className="h-5 w-5" />
      </motion.button>
    </motion.div>
  );
}

export default function EchoSimulator() {
  const [state, setState] = useState<EchoState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [characterIdx, setCharacterIdx] = useState<number>(0);
  const [silenceSeconds, setSilenceSeconds] = useState<number>(2);
  const [noiseGate, setNoiseGate] = useState<number>(DEFAULT_NOISE_GATE_INDEX);
  const [level, setLevel] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [pastEchoes, setPastEchoes] = useState<PastEcho[]>([]);
  const [playingEchoId, setPlayingEchoId] = useState<number | null>(null);
  const [mode, setMode] = useState<VisualMode>("aura");

  const character = CHARACTERS[characterIdx]!;

  const stateRef = useRef<EchoState>("idle");
  // oxlint-disable-next-line react/refs -- TODO: written during render to keep callbacks in sync; move to a useEffect/useLayoutEffect.
  stateRef.current = state;
  const silenceSecondsRef = useRef<number>(silenceSeconds);
  // oxlint-disable-next-line react/refs -- TODO: written during render to keep callbacks in sync; move to a useEffect/useLayoutEffect.
  silenceSecondsRef.current = silenceSeconds;
  const noiseGateRef = useRef<number>(NOISE_GATE_LEVELS[noiseGate]!);
  // oxlint-disable-next-line react/refs -- TODO: written during render to keep callbacks in sync; move to a useEffect/useLayoutEffect.
  noiseGateRef.current =
    NOISE_GATE_LEVELS[noiseGate] ?? NOISE_GATE_LEVELS[DEFAULT_NOISE_GATE_INDEX]!;
  const characterRef = useRef<CharacterDef>(character);
  // oxlint-disable-next-line react/refs -- TODO: written during render to keep callbacks in sync; move to a useEffect/useLayoutEffect.
  characterRef.current = character;

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSoundRef = useRef<number>(0);
  const segmentSilenceStartRef = useRef<number | null>(null);
  const pendingSegmentsRef = useRef<Blob[]>([]);
  const pendingDurationRef = useRef<number>(0);
  const triggerPlaybackRef = useRef<boolean>(false);
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const bufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const freqBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(EQ_BINS));
  const goIdleAfterPlaybackRef = useRef<boolean>(false);
  const nextEchoIdRef = useRef<number>(1);

  const stopInput = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    segmentSilenceStartRef.current = null;
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const closePlayback = useCallback(() => {
    if (stopPlaybackRef.current) {
      stopPlaybackRef.current();
      stopPlaybackRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setPlayingEchoId(null);
  }, []);

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    pendingSegmentsRef.current = [];
    pendingDurationRef.current = 0;
    triggerPlaybackRef.current = false;
    goIdleAfterPlaybackRef.current = false;
    stopInput();
    closePlayback();
  }, [stopInput, closePlayback]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const ensurePlaybackContext = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const playEchoSegments = useCallback(
    (echo: PastEcho, returnToListening: boolean) => {
      if (stopPlaybackRef.current) {
        stopPlaybackRef.current();
        stopPlaybackRef.current = null;
      }
      const ctx = ensurePlaybackContext();
      if (!ctx) return;
      setState("playing");
      setSilenceCountdown(null);
      setPlayingEchoId(echo.id);
      stopPlaybackRef.current = playSegmentsWithVoice(
        ctx,
        echo.segments,
        characterRef.current.voice,
        () => {
          stopPlaybackRef.current = null;
          setPlayingEchoId(null);
          if (goIdleAfterPlaybackRef.current) {
            goIdleAfterPlaybackRef.current = false;
            closePlayback();
            setState("idle");
            setLevel(0);
            return;
          }
          if (returnToListening && stateRef.current === "playing") {
            lastSoundRef.current = performance.now();
            segmentSilenceStartRef.current = null;
            setState("listening");
          } else if (!returnToListening && stateRef.current === "playing") {
            setState("listening");
          }
        }
      );
    },
    [closePlayback, ensurePlaybackContext]
  );

  const finishAndPlay = useCallback(() => {
    const segments = pendingSegmentsRef.current;
    const duration = pendingDurationRef.current;
    pendingSegmentsRef.current = [];
    pendingDurationRef.current = 0;
    triggerPlaybackRef.current = false;
    setSilenceCountdown(null);
    if (segments.length === 0) {
      if (goIdleAfterPlaybackRef.current) {
        goIdleAfterPlaybackRef.current = false;
        closePlayback();
        setState("idle");
        setLevel(0);
        return;
      }
      setState("listening");
      lastSoundRef.current = performance.now();
      segmentSilenceStartRef.current = null;
      return;
    }
    const echo: PastEcho = {
      id: nextEchoIdRef.current++,
      segments,
      durationMs: duration,
      createdAt: Date.now(),
    };
    setPastEchoes((prev) => [echo, ...prev].slice(0, MAX_PAST_ECHOES));
    playEchoSegments(echo, true);
  }, [closePlayback, playEchoSegments]);

  const startRecorder = useCallback(() => {
    if (!streamRef.current) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );
    const chunks: Blob[] = [];
    const startedAt = performance.now();
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
      const dur = performance.now() - startedAt;
      if (blob.size >= 800 && dur >= 200) {
        pendingSegmentsRef.current.push(blob);
        pendingDurationRef.current += dur;
      }
      if (triggerPlaybackRef.current) {
        finishAndPlay();
      }
    };
    recorder.start();
    recorderRef.current = recorder;
  }, [finishAndPlay]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = bufferRef.current;
    if (!analyser || !buf) {
      // oxlint-disable-next-line react/immutability -- TODO: `tick` is read while still initializing; use a named function expression instead of self-referencing the const.
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const rms = getRMS(analyser, buf);
    setLevel(rms);

    const fbuf = freqBufferRef.current;
    if (fbuf) {
      analyser.getByteFrequencyData(fbuf);
      const out = freqDataRef.current;
      const total = fbuf.length;
      // Log-spaced sampling so low-end bands don't hog all the energy
      // visually, plus a tilt that boosts the highs to compensate the
      // natural ~1/f roll-off of speech.
      const minIdx = 1;
      const maxIdx = total - 1;
      const span = Math.log(maxIdx / minIdx);
      for (let i = 0; i < EQ_BINS; i++) {
        const f = i / (EQ_BINS - 1);
        const idx = Math.min(
          maxIdx,
          Math.max(minIdx, Math.round(minIdx * Math.exp(f * span)))
        );
        const boost = 1 + f * 1.8;
        out[i] = Math.min(255, (fbuf[idx] ?? 0) * boost);
      }
    }

    const now = performance.now();
    const current = stateRef.current;
    const isSound = rms > noiseGateRef.current;

    if (current === "listening" || current === "recording") {
      if (isSound) {
        lastSoundRef.current = now;
        segmentSilenceStartRef.current = null;
        setSilenceCountdown(null);
        if (current === "listening") {
          setState("recording");
          startRecorder();
        }
      } else {
        if (current === "recording") {
          if (segmentSilenceStartRef.current === null) {
            segmentSilenceStartRef.current = now;
          }
          const segSilence = now - segmentSilenceStartRef.current;
          if (segSilence >= SHORT_SILENCE_MS) {
            const r = recorderRef.current;
            if (r && r.state === "recording") {
              try {
                r.stop();
              } catch {}
            }
            recorderRef.current = null;
            segmentSilenceStartRef.current = null;
            setState("listening");
          }
        }

        const hasContent =
          pendingSegmentsRef.current.length > 0 || recorderRef.current !== null;
        if (hasContent) {
          const totalSilence = (now - lastSoundRef.current) / 1000;
          const remaining = silenceSecondsRef.current - totalSilence;
          setSilenceCountdown(Math.max(0, remaining));
          if (totalSilence >= silenceSecondsRef.current) {
            const r = recorderRef.current;
            if (r && r.state === "recording") {
              triggerPlaybackRef.current = true;
              try {
                r.stop();
              } catch {}
              recorderRef.current = null;
            } else {
              finishAndPlay();
            }
          }
        } else {
          setSilenceCountdown(null);
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [finishAndPlay, startRecorder]);

  const start = useCallback(async () => {
    setErrorMsg(null);
    setState("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const ctx = ensurePlaybackContext();
      if (!ctx) throw new Error("Sin soporte de audio");
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;
      bufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      freqBufferRef.current = new Uint8Array(
        new ArrayBuffer(analyser.frequencyBinCount)
      );

      lastSoundRef.current = performance.now();
      segmentSilenceStartRef.current = null;
      pendingSegmentsRef.current = [];
      pendingDurationRef.current = 0;
      triggerPlaybackRef.current = false;
      setState("listening");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No pude acceder al micrófono.";
      setErrorMsg(msg);
      setState("error");
      cleanup();
    }
  }, [cleanup, ensurePlaybackContext, tick]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    const hasRecorder = !!recorder && recorder.state === "recording";
    const hasPending = pendingSegmentsRef.current.length > 0;

    stopInput();
    setSilenceCountdown(null);

    if (hasRecorder) {
      goIdleAfterPlaybackRef.current = true;
      triggerPlaybackRef.current = true;
      try {
        recorder!.stop();
      } catch {}
      recorderRef.current = null;
    } else if (hasPending) {
      goIdleAfterPlaybackRef.current = true;
      finishAndPlay();
    } else {
      closePlayback();
      setState("idle");
      setLevel(0);
    }
  }, [closePlayback, finishAndPlay, stopInput]);

  const stopCurrentPlayback = useCallback(() => {
    if (stopPlaybackRef.current) {
      stopPlaybackRef.current();
      stopPlaybackRef.current = null;
    }
    setPlayingEchoId(null);
    if (stateRef.current === "playing") {
      lastSoundRef.current = performance.now();
      segmentSilenceStartRef.current = null;
      setState("listening");
    }
  }, []);

  const playPastEcho = useCallback(
    (echo: PastEcho) => {
      const wasIdle = stateRef.current === "idle" || stateRef.current === "error";
      playEchoSegments(echo, !wasIdle);
    },
    [playEchoSegments]
  );

  const deletePastEcho = useCallback(
    (id: number) => {
      setPastEchoes((prev) => prev.filter((e) => e.id !== id));
      if (playingEchoId === id) {
        stopCurrentPlayback();
      }
    },
    [playingEchoId, stopCurrentPlayback]
  );

  const clearPastEchoes = useCallback(() => {
    stopCurrentPlayback();
    setPastEchoes([]);
  }, [stopCurrentPlayback]);

  const isActive =
    state === "listening" || state === "recording" || state === "playing";
  const characterScale =
    state === "playing" ? 1.18 : state === "recording" ? 1 + level * 3.5 : 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-300 via-fuchsia-300 to-amber-200">
      {/* Floating bubbles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => {
          const left = (i * 17) % 100;
          const size = 80 + ((i * 41) % 120);
          const delay = i * 0.8;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/30 blur-2xl"
              style={{ left: `${left}%`, width: size, height: size, top: "110%" }}
              animate={{ y: ["0%", "-1200%"] }}
              transition={{
                duration: 20 + i * 2,
                repeat: Infinity,
                delay,
                ease: "linear",
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-3 py-3">
        <h1 className="mb-1 text-center text-2xl font-black text-white drop-shadow-lg">
          🎤 Eco Mágico
        </h1>

        {/* Character + visualizer */}
        {mode === "aura" ? (
          <div className="relative -my-4 mb-2 flex h-80 w-full items-center justify-center sm:h-96">
            <div className="pointer-events-none absolute -inset-x-10 -inset-y-8 z-0">
              <EchoAura
                freqDataRef={freqDataRef}
                hue={character.hue}
                active={isActive}
              />
            </div>
            <motion.div
              key={character.emoji}
              className="relative z-10 select-none text-[7.5rem] leading-none drop-shadow-2xl"
              animate={{
                scale: characterScale,
                rotate: state === "playing" ? [0, -8, 8, -6, 6, 0] : 0,
                y: state === "recording" ? [0, -6, 0] : 0,
              }}
              transition={
                state === "playing"
                  ? { duration: 0.8, repeat: Infinity }
                  : state === "recording"
                    ? { duration: 0.4, repeat: Infinity }
                    : { type: "spring", stiffness: 200, damping: 15 }
              }
            >
              {character.emoji}
            </motion.div>
          </div>
        ) : (
          <>
            <div className="relative mb-1 flex h-44 w-44 items-center justify-center">
              <motion.div
                key={character.emoji}
                className="relative select-none text-[6.5rem] leading-none drop-shadow-2xl"
                animate={{
                  scale: characterScale,
                  rotate: state === "playing" ? [0, -8, 8, -6, 6, 0] : 0,
                  y: state === "recording" ? [0, -6, 0] : 0,
                }}
                transition={
                  state === "playing"
                    ? { duration: 0.8, repeat: Infinity }
                    : state === "recording"
                      ? { duration: 0.4, repeat: Infinity }
                      : { type: "spring", stiffness: 200, damping: 15 }
                }
              >
                {character.emoji}
              </motion.div>
            </div>
            <div className="mb-3 w-full overflow-hidden rounded-2xl bg-black/15 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
              <EchoEqualizer
                freqDataRef={freqDataRef}
                hue={character.hue}
                active={isActive}
              />
            </div>
          </>
        )}

        {/* Silence countdown */}
        <div className="mb-2 flex h-8 items-center">
          <AnimatePresence>
            {silenceCountdown !== null && silenceCountdown > 0 && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-sm font-bold text-white shadow"
              >
                <Sparkles className="h-4 w-4" />
                {Math.ceil(silenceCountdown)}s
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main control */}
        <div className="mb-3 flex w-full items-center justify-center">
          {state === "idle" || state === "error" ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={start}
              className="flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-10 py-5 text-2xl font-black text-white shadow-2xl ring-4 ring-white/40 hover:shadow-pink-500/50"
            >
              <Mic className="h-8 w-8" />
              ¡Empezar!
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stop}
              className="flex items-center gap-3 rounded-full bg-white px-8 py-4 text-xl font-black text-rose-600 shadow-2xl ring-4 ring-rose-200"
            >
              <MicOff className="h-7 w-7" />
              Parar
            </motion.button>
          )}
        </div>

        {/* Character picker — larger buttons */}
        <div className="mb-3 grid w-full max-w-sm grid-cols-6 gap-2">
          {CHARACTERS.map((c, i) => (
            <motion.button
              key={c.emoji}
              whileHover={{ scale: 1.15, rotate: 6 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCharacterIdx(i)}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl shadow-lg transition-colors ${
                characterIdx === i
                  ? "bg-yellow-300 ring-4 ring-white"
                  : "bg-white/75 hover:bg-white"
              }`}
              aria-label={`Elegir ${c.name}`}
              title={c.name}
            >
              {c.emoji}
            </motion.button>
          ))}
        </div>

        {/* Sliders — compact */}
        <div className="mb-3 w-full max-w-sm space-y-1 rounded-2xl bg-white/75 px-4 py-2 shadow">
          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 text-xs font-bold text-purple-700">
              Silencio
            </label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={silenceSeconds}
              onChange={(e) => setSilenceSeconds(Number(e.target.value))}
              className="flex-1 accent-purple-600"
            />
            <span className="w-10 shrink-0 rounded-full bg-purple-600 px-2 py-0.5 text-center text-xs font-bold text-white">
              {silenceSeconds}s
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label
              className="w-16 shrink-0 text-xs font-bold text-purple-700"
              title="Ignora ruido por debajo de este umbral"
            >
              Ruido
            </label>
            <input
              type="range"
              min={0}
              max={NOISE_GATE_LEVELS.length - 1}
              step={1}
              value={noiseGate}
              onChange={(e) => setNoiseGate(Number(e.target.value))}
              className="flex-1 accent-purple-600"
            />
            <span className="w-10 shrink-0 rounded-full bg-purple-600 px-2 py-0.5 text-center text-xs font-bold text-white">
              {noiseGate + 1}
            </span>
          </div>
        </div>

        {/* Past echoes */}
        {pastEchoes.length > 0 && (
          <div className="mb-3 w-full max-w-sm rounded-2xl bg-white/60 p-3 shadow">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-purple-800">
                Tus ecos
              </h2>
              <button
                onClick={clearPastEchoes}
                className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                Borrar todos
              </button>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {pastEchoes.map((echo, i) => (
                  <PastEchoItem
                    key={echo.id}
                    echo={echo}
                    index={i}
                    isPlayingThis={playingEchoId === echo.id}
                    onPlay={() => playPastEcho(echo)}
                    onStop={stopCurrentPlayback}
                    onDelete={() => deletePastEcho(echo.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {state === "error" && errorMsg && (
          <div className="w-full max-w-sm rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <RefreshCw className="h-4 w-4" />
              ¡Vaya!
            </div>
            {errorMsg}
          </div>
        )}

        {/* Visual mode toggle (temporary) */}
        <div className="mt-4 mb-2 flex items-center gap-2 rounded-full bg-white/40 p-1 text-xs font-bold text-purple-800 shadow">
          <span className="px-2 text-[10px] uppercase tracking-wide opacity-70">
            Visual
          </span>
          <button
            onClick={() => setMode("aura")}
            className={`rounded-full px-4 py-1.5 transition ${
              mode === "aura"
                ? "bg-purple-600 text-white shadow"
                : "text-purple-700 hover:bg-white/60"
            }`}
          >
            Aura
          </button>
          <button
            onClick={() => setMode("equalizer")}
            className={`rounded-full px-4 py-1.5 transition ${
              mode === "equalizer"
                ? "bg-purple-600 text-white shadow"
                : "text-purple-700 hover:bg-white/60"
            }`}
          >
            Ecualizador
          </button>
        </div>
      </div>
    </div>
  );
}
