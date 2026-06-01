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

const SILENCE_THRESHOLD = 0.02;
const SHORT_SILENCE_MS = 600;
const MAX_PAST_ECHOES = 12;

const CHARACTERS = ["🦜", "🐸", "🦊", "🐵", "🐼", "🦄"] as const;

const STATE_LABELS: Record<EchoState, string> = {
  idle: "¡Pulsa para empezar!",
  permission: "Permite el micrófono…",
  listening: "Te escucho…",
  recording: "¡Habla, habla!",
  playing: "¡Te lo repito!",
  error: "Ups, algo falló",
};

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

function playSegmentChain(
  segments: Blob[],
  onEnd: () => void,
  setPlayer: (a: HTMLAudioElement | null) => void
): () => void {
  let cancelled = false;
  let current: HTMLAudioElement | null = null;
  let idx = 0;

  const playNext = () => {
    if (cancelled) return;
    if (idx >= segments.length) {
      setPlayer(null);
      onEnd();
      return;
    }
    const blob = segments[idx++]!;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    current = audio;
    setPlayer(audio);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onended = () => {
      cleanup();
      playNext();
    };
    audio.onerror = () => {
      cleanup();
      playNext();
    };
    audio.play().catch(() => {
      cleanup();
      playNext();
    });
  };

  playNext();

  return () => {
    cancelled = true;
    if (current) {
      try {
        current.pause();
      } catch {}
    }
    setPlayer(null);
  };
}

function WaveBars({ level, active }: { level: number; active: boolean }) {
  const bars = 16;
  const items = Array.from({ length: bars }, (_, i) => {
    const center = (bars - 1) / 2;
    const dist = Math.abs(i - center) / center;
    const wave = (1 - dist * 0.6) * level * 100;
    const height = Math.max(6, Math.min(72, wave + (active ? 8 : 0)));
    return { i, height };
  });

  return (
    <div className="flex items-end justify-center gap-1.5 h-20 w-full max-w-md">
      {items.map(({ i, height }) => (
        <motion.div
          key={i}
          animate={{ height }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-3 rounded-full bg-gradient-to-t from-fuchsia-500 via-pink-400 to-yellow-300 shadow-md"
          style={{ height }}
        />
      ))}
    </div>
  );
}

function FloatingSparkles({ playing }: { playing: boolean }) {
  if (!playing) return null;
  const sparkles = Array.from({ length: 12 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparkles.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 1.2 + Math.random() * 1.5;
        const size = 18 + Math.random() * 18;
        return (
          <motion.div
            key={i}
            initial={{ y: "110%", opacity: 0, rotate: 0 }}
            animate={{ y: "-20%", opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeOut" }}
            className="absolute text-yellow-300"
            style={{ left: `${left}%`, fontSize: size }}
          >
            ✨
          </motion.div>
        );
      })}
    </div>
  );
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
        className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow ${
          isPlayingThis
            ? "bg-rose-500"
            : "bg-gradient-to-br from-purple-500 to-pink-500"
        }`}
        aria-label={isPlayingThis ? "Parar eco" : "Reproducir eco"}
      >
        {isPlayingThis ? (
          <span className="block h-3 w-3 rounded-sm bg-white" />
        ) : (
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
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
        className="flex h-8 w-8 items-center justify-center rounded-full text-purple-500 hover:bg-rose-100 hover:text-rose-600"
        aria-label="Borrar eco"
      >
        <Trash2 className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}

export default function EchoSimulator() {
  const [state, setState] = useState<EchoState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [character, setCharacter] = useState<string>(CHARACTERS[0]);
  const [silenceSeconds, setSilenceSeconds] = useState<number>(3);
  const [level, setLevel] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [pastEchoes, setPastEchoes] = useState<PastEcho[]>([]);
  const [playingEchoId, setPlayingEchoId] = useState<number | null>(null);

  const stateRef = useRef<EchoState>("idle");
  stateRef.current = state;
  const silenceSecondsRef = useRef<number>(silenceSeconds);
  silenceSecondsRef.current = silenceSeconds;

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStartRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastSoundRef = useRef<number>(0);
  const segmentSilenceStartRef = useRef<number | null>(null);
  const pendingSegmentsRef = useRef<Blob[]>([]);
  const pendingDurationRef = useRef<number>(0);
  const triggerPlaybackRef = useRef<boolean>(false);
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const bufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const nextEchoIdRef = useRef<number>(1);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    pendingSegmentsRef.current = [];
    pendingDurationRef.current = 0;
    triggerPlaybackRef.current = false;
    segmentSilenceStartRef.current = null;
    if (stopPlaybackRef.current) {
      stopPlaybackRef.current();
      stopPlaybackRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    playerRef.current = null;
    setPlayingEchoId(null);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const playEchoSegments = useCallback(
    (echo: PastEcho, returnToListening: boolean) => {
      if (stopPlaybackRef.current) {
        stopPlaybackRef.current();
        stopPlaybackRef.current = null;
      }
      setState("playing");
      setSilenceCountdown(null);
      setPlayingEchoId(echo.id);
      stopPlaybackRef.current = playSegmentChain(
        echo.segments,
        () => {
          stopPlaybackRef.current = null;
          setPlayingEchoId(null);
          playerRef.current = null;
          if (returnToListening && stateRef.current === "playing") {
            lastSoundRef.current = performance.now();
            segmentSilenceStartRef.current = null;
            setState("listening");
          } else if (!returnToListening) {
            // came from past echo manual play; restore prior state
            if (stateRef.current === "playing") {
              setState("listening");
            }
          }
        },
        (a) => {
          playerRef.current = a;
        }
      );
    },
    []
  );

  const finishAndPlay = useCallback(() => {
    const segments = pendingSegmentsRef.current;
    const duration = pendingDurationRef.current;
    pendingSegmentsRef.current = [];
    pendingDurationRef.current = 0;
    triggerPlaybackRef.current = false;
    setSilenceCountdown(null);
    if (segments.length === 0) {
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
  }, [playEchoSegments]);

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
    recorderStartRef.current = startedAt;
  }, [finishAndPlay]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = bufferRef.current;
    if (!analyser || !buf) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const rms = getRMS(analyser, buf);
    setLevel(rms);

    const now = performance.now();
    const current = stateRef.current;
    const isSound = rms > SILENCE_THRESHOLD;

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

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      bufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));

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
  }, [cleanup, tick]);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
    setLevel(0);
    setSilenceCountdown(null);
  }, [cleanup]);

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
    state === "playing" ? 1.2 : state === "recording" ? 1 + level * 4 : 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-300 via-fuchsia-300 to-amber-200">
      {/* Floating background bubbles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => {
          const left = (i * 13) % 100;
          const size = 80 + ((i * 37) % 120);
          const delay = i * 0.7;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/30 blur-2xl"
              style={{ left: `${left}%`, width: size, height: size, top: "110%" }}
              animate={{ y: ["0%", "-1200%"] }}
              transition={{
                duration: 18 + i * 2,
                repeat: Infinity,
                delay,
                ease: "linear",
              }}
            />
          );
        })}
      </div>

      <FloatingSparkles playing={state === "playing"} />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 py-8">
        <motion.h1
          className="mb-2 text-center text-4xl font-black text-white drop-shadow-lg sm:text-5xl"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          🎤 Eco Mágico 🎤
        </motion.h1>
        <p className="mb-6 text-center text-base font-semibold text-white/90 drop-shadow">
          Habla y espera… ¡el eco repetirá lo que digas!
        </p>

        {/* Character */}
        <div className="relative mb-4 flex h-56 w-56 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full bg-white/40 blur-2xl"
            animate={{
              scale: state === "recording" ? 1 + level * 3 : 1,
              opacity: isActive ? 0.8 : 0.3,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          />
          <motion.div
            className="absolute inset-2 rounded-full bg-white/70 shadow-2xl"
            animate={{
              scale: state === "recording" ? 1 + level * 1.5 : 1,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          />
          <motion.div
            key={character}
            className="relative select-none text-[8rem] leading-none"
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
            {character}
          </motion.div>
        </div>

        {/* State label */}
        <div className="relative mb-2 h-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ y: 8, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.9 }}
              className="rounded-full bg-white/80 px-5 py-1.5 text-xl font-extrabold text-purple-700 shadow-md"
            >
              {STATE_LABELS[state]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Silence countdown */}
        <div className="mb-3 h-8">
          <AnimatePresence>
            {silenceCountdown !== null && silenceCountdown > 0 && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-2 text-lg font-bold text-white drop-shadow"
              >
                <Sparkles className="h-5 w-5" />
                {Math.ceil(silenceCountdown)}s para el eco…
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Waveform */}
        <div className="mb-6 w-full">
          <WaveBars level={level} active={isActive} />
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          {state === "idle" || state === "error" ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={start}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-4 text-xl font-bold text-white shadow-xl hover:shadow-2xl"
            >
              <Mic className="h-7 w-7" />
              ¡Empezar!
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stop}
              className="flex items-center gap-2 rounded-full bg-white/90 px-6 py-3 text-lg font-bold text-rose-600 shadow-xl hover:bg-white"
            >
              <MicOff className="h-6 w-6" />
              Parar
            </motion.button>
          )}
        </div>

        {/* Character picker */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-semibold text-white drop-shadow">
            Elige tu amigo:
          </span>
          {CHARACTERS.map((c) => (
            <motion.button
              key={c}
              whileHover={{ scale: 1.2, rotate: 8 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCharacter(c)}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-3xl shadow-md transition-colors ${
                character === c
                  ? "bg-yellow-300 ring-4 ring-white"
                  : "bg-white/70 hover:bg-white"
              }`}
              aria-label={`Elegir ${c}`}
            >
              {c}
            </motion.button>
          ))}
        </div>

        {/* Silence slider */}
        <div className="mb-6 w-full max-w-xs rounded-2xl bg-white/70 p-4 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-purple-700">
              Silencio para el eco
            </label>
            <span className="rounded-full bg-purple-600 px-3 py-0.5 text-sm font-bold text-white">
              {silenceSeconds}s
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={silenceSeconds}
            onChange={(e) => setSilenceSeconds(Number(e.target.value))}
            className="w-full accent-purple-600"
          />
        </div>

        {/* Past echoes list */}
        {pastEchoes.length > 0 && (
          <div className="mb-6 w-full max-w-md rounded-2xl bg-white/60 p-4 shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-purple-800">
                Tus ecos guardados
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

        {/* Error */}
        {state === "error" && errorMsg && (
          <div className="w-full max-w-md rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <RefreshCw className="h-4 w-4" />
              ¡Vaya!
            </div>
            {errorMsg}
          </div>
        )}

        {/* Quick help */}
        {state === "idle" && pastEchoes.length === 0 && (
          <div className="mt-2 max-w-md rounded-2xl bg-white/70 px-5 py-4 text-sm text-purple-900 shadow">
            <p className="mb-2 font-bold">¿Cómo se juega?</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Pulsa el botón gigante de “¡Empezar!”.</li>
              <li>Di algo divertido al micro 🎙️.</li>
              <li>Quédate en silencio y el eco lo repetirá. ¡Magia!</li>
            </ol>
            <p className="mt-3 flex items-center gap-1 text-xs text-purple-700">
              <Play className="h-3 w-3" /> Necesita permiso del micrófono.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
