import { Mic, MicOff, Volume2, Play, RefreshCw, Sparkles } from "lucide-react";
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
const MIN_RECORDING_MS = 400;

const CHARACTERS = ["🦜", "🐸", "🦊", "🐵", "🐼", "🦄"] as const;

const STATE_LABELS: Record<EchoState, string> = {
  idle: "¡Pulsa para empezar!",
  permission: "Permite el micrófono…",
  listening: "Te escucho…",
  recording: "¡Habla, habla!",
  playing: "¡Te lo repito!",
  error: "Ups, algo falló",
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

export default function EchoSimulator() {
  const [state, setState] = useState<EchoState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [character, setCharacter] = useState<string>(CHARACTERS[0]);
  const [silenceSeconds, setSilenceSeconds] = useState<number>(5);
  const [level, setLevel] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [echoesCount, setEchoesCount] = useState<number>(0);

  const stateRef = useRef<EchoState>("idle");
  stateRef.current = state;
  const silenceSecondsRef = useRef<number>(silenceSeconds);
  silenceSecondsRef.current = silenceSeconds;

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const recordStartRef = useRef<number>(0);
  const lastSoundRef = useRef<number>(0);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const bufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

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
    chunksRef.current = [];
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
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.src = "";
      playerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startRecorder = useCallback(() => {
    if (!streamRef.current) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const duration = performance.now() - recordStartRef.current;
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      chunksRef.current = [];
      if (duration < MIN_RECORDING_MS || blob.size < 1000) {
        // Too short — keep listening
        setState("listening");
        startRecorder();
        return;
      }
      playBack(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    recordStartRef.current = performance.now();
  }, []);

  const playBack = useCallback((blob: Blob) => {
    setState("playing");
    setSilenceCountdown(null);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    playerRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setEchoesCount((c) => c + 1);
      if (stateRef.current !== "idle" && stateRef.current !== "error") {
        setState("listening");
        startRecorder();
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      setState("listening");
      startRecorder();
    };
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      setState("listening");
      startRecorder();
    });
  }, [startRecorder]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = bufferRef.current;
    if (!analyser || !buf) return;

    const rms = getRMS(analyser, buf);
    setLevel(rms);

    const now = performance.now();
    const current = stateRef.current;

    if (current === "listening") {
      if (rms > SILENCE_THRESHOLD) {
        lastSoundRef.current = now;
        setState("recording");
      }
    } else if (current === "recording") {
      if (rms > SILENCE_THRESHOLD) {
        lastSoundRef.current = now;
        setSilenceCountdown(null);
      } else {
        const silenceFor = (now - lastSoundRef.current) / 1000;
        const remaining = silenceSecondsRef.current - silenceFor;
        setSilenceCountdown(Math.max(0, remaining));
        if (silenceFor >= silenceSecondsRef.current) {
          setSilenceCountdown(null);
          const rec = recorderRef.current;
          if (rec && rec.state === "recording") {
            rec.stop();
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

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
      setState("listening");
      startRecorder();
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
  }, [cleanup, startRecorder, tick]);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
    setLevel(0);
    setSilenceCountdown(null);
  }, [cleanup]);

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

        {/* Counter */}
        {echoesCount > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4 flex items-center gap-2 rounded-full bg-yellow-300/90 px-4 py-2 text-sm font-bold text-purple-800 shadow"
          >
            <Volume2 className="h-4 w-4" />
            {echoesCount} {echoesCount === 1 ? "eco" : "ecos"} mágicos
          </motion.div>
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
        {state === "idle" && (
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
