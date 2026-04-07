import { Image, Download, RotateCcw, Crop, Maximize } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_WIDTH = 480;
const TARGET_HEIGHT = 800;
const ASPECT = TARGET_WIDTH / TARGET_HEIGHT; // 0.6

type CropRect = { x: number; y: number; w: number; h: number };
type ResizeMode = "crop" | "stretch";
type DitherMode = "none" | "threshold" | "floydSteinberg" | "atkinson" | "ordered";

type ConversionResult = {
  blob: Blob;
  url: string;
  originalName: string;
  originalSize: number;
};

const DITHER_OPTIONS: { value: DitherMode; label: string; description: string }[] = [
  { value: "none", label: "None", description: "Raw color, no B&W conversion" },
  { value: "threshold", label: "Threshold", description: "Hard B&W cutoff" },
  { value: "floydSteinberg", label: "Floyd-Steinberg", description: "Smooth error diffusion" },
  { value: "atkinson", label: "Atkinson", description: "High contrast, classic Mac" },
  { value: "ordered", label: "Ordered", description: "Patterned Bayer matrix" },
];

// --- Dithering algorithms ---

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
  }
  return gray;
}

function applyGrayscaleToImageData(gray: Float32Array, data: Uint8ClampedArray) {
  for (let i = 0; i < gray.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(gray[i]!)));
    const idx = i * 4;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
  }
}

function ditherThreshold(gray: Float32Array): Float32Array {
  const out = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i]! > 128 ? 255 : 0;
  }
  return out;
}

function ditherFloydSteinberg(gray: Float32Array, w: number, h: number): Float32Array {
  const out = Float32Array.from(gray);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = out[i]!;
      const val = old > 128 ? 255 : 0;
      out[i] = val;
      const err = old - val;
      if (x + 1 < w) out[i + 1] = out[i + 1]! + err * (7 / 16);
      if (y + 1 < h) {
        if (x > 0) out[i + w - 1] = out[i + w - 1]! + err * (3 / 16);
        out[i + w] = out[i + w]! + err * (5 / 16);
        if (x + 1 < w) out[i + w + 1] = out[i + w + 1]! + err * (1 / 16);
      }
    }
  }
  return out;
}

function ditherAtkinson(gray: Float32Array, w: number, h: number): Float32Array {
  const out = Float32Array.from(gray);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = out[i]!;
      const val = old > 128 ? 255 : 0;
      out[i] = val;
      const err = (old - val) / 8;
      if (x + 1 < w) out[i + 1] = out[i + 1]! + err;
      if (x + 2 < w) out[i + 2] = out[i + 2]! + err;
      if (y + 1 < h) {
        if (x > 0) out[i + w - 1] = out[i + w - 1]! + err;
        out[i + w] = out[i + w]! + err;
        if (x + 1 < w) out[i + w + 1] = out[i + w + 1]! + err;
      }
      if (y + 2 < h) out[i + 2 * w] = out[i + 2 * w]! + err;
    }
  }
  return out;
}

// 8x8 Bayer matrix
const BAYER8 = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];

function ditherOrdered(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const threshold = (BAYER8[y % 8]![x % 8]! / 64) * 255;
      out[i] = gray[i]! > threshold ? 255 : 0;
    }
  }
  return out;
}

function applyDither(imageData: ImageData, mode: DitherMode): void {
  if (mode === "none") return;
  const { data, width, height } = imageData;
  const gray = toGrayscale(data, width, height);
  let result: Float32Array;
  switch (mode) {
    case "threshold":
      result = ditherThreshold(gray);
      break;
    case "floydSteinberg":
      result = ditherFloydSteinberg(gray, width, height);
      break;
    case "atkinson":
      result = ditherAtkinson(gray, width, height);
      break;
    case "ordered":
      result = ditherOrdered(gray, width, height);
      break;
  }
  applyGrayscaleToImageData(result, data);
}

// --- BMP encoding ---

function createBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4d);
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  const pixelOffset = 54;
  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = pixelOffset + bmpRow * rowSize + x * 3;
      view.setUint8(dstIdx, data[srcIdx + 2]!);
      view.setUint8(dstIdx + 1, data[srcIdx + 1]!);
      view.setUint8(dstIdx + 2, data[srcIdx]!);
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

// --- Rendering to canvas ---

function renderToCanvas(
  img: HTMLImageElement,
  mode: ResizeMode,
  crop: CropRect,
  dither: DitherMode
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  if (mode === "stretch") {
    ctx.drawImage(img, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  } else {
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  }

  if (dither !== "none") {
    const imageData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    applyDither(imageData, dither);
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

// --- Draggable crop box ---

type DragAction =
  | { type: "move"; startX: number; startY: number; origCrop: CropRect }
  | {
      type: "resize";
      handle: string;
      startX: number;
      startY: number;
      origCrop: CropRect;
    };

function clampCrop(crop: CropRect, imgW: number, imgH: number): CropRect {
  let { x, y, w, h } = crop;
  w = Math.max(20, Math.min(w, imgW));
  h = w / ASPECT;
  if (h > imgH) {
    h = imgH;
    w = h * ASPECT;
  }
  x = Math.max(0, Math.min(x, imgW - w));
  y = Math.max(0, Math.min(y, imgH - h));
  return { x, y, w, h };
}

function defaultCrop(imgW: number, imgH: number): CropRect {
  const imgAspect = imgW / imgH;
  let w: number, h: number;
  if (imgAspect > ASPECT) {
    h = imgH;
    w = h * ASPECT;
  } else {
    w = imgW;
    h = w / ASPECT;
  }
  return { x: (imgW - w) / 2, y: (imgH - h) / 2, w, h };
}

function CropOverlay({
  crop,
  imgW,
  imgH,
  containerW,
  containerH,
  onCropChange,
}: {
  crop: CropRect;
  imgW: number;
  imgH: number;
  containerW: number;
  containerH: number;
  onCropChange: (c: CropRect) => void;
}) {
  const dragRef = useRef<DragAction | null>(null);
  const scaleX = containerW / imgW;
  const scaleY = containerH / imgH;

  const toScreen = (c: CropRect) => ({
    x: c.x * scaleX,
    y: c.y * scaleY,
    w: c.w * scaleX,
    h: c.h * scaleY,
  });

  const sc = toScreen(crop);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, actionType: "move" | string) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      if (actionType === "move") {
        dragRef.current = {
          type: "move",
          startX: e.clientX,
          startY: e.clientY,
          origCrop: { ...crop },
        };
      } else {
        dragRef.current = {
          type: "resize",
          handle: actionType,
          startX: e.clientX,
          startY: e.clientY,
          origCrop: { ...crop },
        };
      }
    },
    [crop]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const action = dragRef.current;
      if (!action) return;
      const dx = (e.clientX - action.startX) / scaleX;
      const dy = (e.clientY - action.startY) / scaleY;
      const oc = action.origCrop;

      if (action.type === "move") {
        onCropChange(
          clampCrop({ x: oc.x + dx, y: oc.y + dy, w: oc.w, h: oc.h }, imgW, imgH)
        );
      } else {
        const h = action.handle;
        let newW = oc.w;
        let newX = oc.x;
        let newY = oc.y;

        if (h.includes("e")) newW = oc.w + dx;
        if (h.includes("w")) {
          newW = oc.w - dx;
          newX = oc.x + dx;
        }
        if (h.includes("s")) {
          newW = oc.w + dy * ASPECT;
        }
        if (h.includes("n")) {
          newW = oc.w - dy * ASPECT;
          newY = oc.y + dy;
        }

        newW = Math.max(20, newW);
        const newH = newW / ASPECT;
        onCropChange(clampCrop({ x: newX, y: newY, w: newW, h: newH }, imgW, imgH));
      }
    },
    [imgW, imgH, scaleX, scaleY, onCropChange]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handles = ["nw", "ne", "sw", "se"] as const;
  const handlePos: Record<string, { left: string; top: string; cursor: string }> = {
    nw: { left: "-4px", top: "-4px", cursor: "nwse-resize" },
    ne: { left: "calc(100% - 4px)", top: "-4px", cursor: "nesw-resize" },
    sw: { left: "-4px", top: "calc(100% - 4px)", cursor: "nesw-resize" },
    se: {
      left: "calc(100% - 4px)",
      top: "calc(100% - 4px)",
      cursor: "nwse-resize",
    },
  };

  return (
    <div
      className="absolute inset-0"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bg-black/50"
          style={{ left: 0, top: 0, right: 0, height: sc.y }}
        />
        <div
          className="absolute bg-black/50"
          style={{ left: 0, top: sc.y + sc.h, right: 0, bottom: 0 }}
        />
        <div
          className="absolute bg-black/50"
          style={{ left: 0, top: sc.y, width: sc.x, height: sc.h }}
        />
        <div
          className="absolute bg-black/50"
          style={{ left: sc.x + sc.w, top: sc.y, right: 0, height: sc.h }}
        />
      </div>

      <div
        className="absolute border-2 border-white shadow-lg"
        style={{
          left: sc.x,
          top: sc.y,
          width: sc.w,
          height: sc.h,
          cursor: "move",
        }}
        onPointerDown={(e) => onPointerDown(e, "move")}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute bg-white/30"
            style={{ left: "33.3%", top: 0, width: 1, bottom: 0 }}
          />
          <div
            className="absolute bg-white/30"
            style={{ left: "66.6%", top: 0, width: 1, bottom: 0 }}
          />
          <div
            className="absolute bg-white/30"
            style={{ top: "33.3%", left: 0, height: 1, right: 0 }}
          />
          <div
            className="absolute bg-white/30"
            style={{ top: "66.6%", left: 0, height: 1, right: 0 }}
          />
        </div>

        {handles.map((h) => (
          <div
            key={h}
            className="absolute w-3 h-3 bg-white border border-gray-400 rounded-sm"
            style={{
              ...handlePos[h],
              cursor: handlePos[h]!.cursor,
            }}
            onPointerDown={(e) => onPointerDown(e, h)}
          />
        ))}
      </div>
    </div>
  );
}

// --- Dither gallery ---

const DETAIL_SIZE = 200; // pixels to crop from center for the detail view

type DetailView = "full" | "detail";

function DitherThumb({
  img,
  mode,
  crop,
  dither,
  label,
  selected,
  onSelect,
}: {
  img: HTMLImageElement;
  mode: ResizeMode;
  crop: CropRect;
  dither: DitherMode;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pendingRef = useRef(false);
  const lastArgsRef = useRef({ mode, crop, dither });
  lastArgsRef.current = { mode, crop, dither };

  useEffect(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    requestAnimationFrame(() => {
      pendingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { mode: m, crop: c, dither: d } = lastArgsRef.current;
      const rendered = renderToCanvas(img, m, c, d);
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(rendered, 0, 0);
    });
  }, [img, mode, crop, dither]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg p-1.5 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
        selected
          ? "ring-2 ring-indigo-600 bg-indigo-50"
          : "ring-1 ring-gray-200 hover:ring-indigo-300 bg-white"
      }`}
    >
      <canvas
        ref={canvasRef}
        className="rounded bg-white"
        style={{ imageRendering: "pixelated", aspectRatio: "3/5", width: 48 }}
      />
      <p className={`text-xs font-medium leading-tight ${selected ? "text-indigo-700" : "text-gray-700"}`}>
        {label}
      </p>
    </button>
  );
}

function DitherMainPreview({
  img,
  mode,
  crop,
  dither,
  view,
}: {
  img: HTMLImageElement;
  mode: ResizeMode;
  crop: CropRect;
  dither: DitherMode;
  view: DetailView;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pendingRef = useRef(false);
  const lastArgsRef = useRef({ mode, crop, dither, view });
  lastArgsRef.current = { mode, crop, dither, view };

  useEffect(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    requestAnimationFrame(() => {
      pendingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { mode: m, crop: c, dither: d, view: v } = lastArgsRef.current;
      const rendered = renderToCanvas(img, m, c, d);

      if (v === "detail" && d !== "none") {
        canvas.width = DETAIL_SIZE;
        canvas.height = DETAIL_SIZE;
        const ctx = canvas.getContext("2d")!;
        const sx = Math.floor((TARGET_WIDTH - DETAIL_SIZE) / 2);
        const sy = Math.floor((TARGET_HEIGHT - DETAIL_SIZE) / 2);
        ctx.drawImage(rendered, sx, sy, DETAIL_SIZE, DETAIL_SIZE, 0, 0, DETAIL_SIZE, DETAIL_SIZE);
      } else {
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(rendered, 0, 0);
      }
    });
  }, [img, mode, crop, dither, view]);

  const isDetail = view === "detail" && dither !== "none";

  return (
    <canvas
      ref={canvasRef}
      className="rounded border border-gray-200 bg-white mx-auto"
      style={{
        imageRendering: "pixelated",
        maxHeight: 420,
        width: "auto",
        height: "100%",
        aspectRatio: isDetail ? "1" : "3/5",
      }}
    />
  );
}

function DitherGallery({
  img,
  mode,
  crop,
  selected,
  onSelect,
}: {
  img: HTMLImageElement;
  mode: ResizeMode;
  crop: CropRect;
  selected: DitherMode;
  onSelect: (d: DitherMode) => void;
}) {
  const [view, setView] = useState<DetailView>("full");
  const selectedOpt = DITHER_OPTIONS.find((o) => o.value === selected)!;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-600">
        Choose dithering — click to select
      </p>

      {/* Thumbnail strip */}
      <div className="flex gap-2">
        {DITHER_OPTIONS.map((opt) => (
          <DitherThumb
            key={opt.value}
            img={img}
            mode={mode}
            crop={crop}
            dither={opt.value}
            label={opt.label}
            selected={selected === opt.value}
            onSelect={() => onSelect(opt.value)}
          />
        ))}
      </div>

      {/* Large preview with view toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-gray-800">{selectedOpt.label}</span>
            <span className="text-xs text-gray-500 ml-2">{selectedOpt.description}</span>
          </div>
          {selected !== "none" && (
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setView("full")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  view === "full"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Full
              </button>
              <button
                onClick={() => setView("detail")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  view === "detail"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                1:1 Detail
              </button>
            </div>
          )}
        </div>
        <DitherMainPreview
          img={img}
          mode={mode}
          crop={crop}
          dither={selected}
          view={view}
        />
      </div>
    </div>
  );
}

// --- Main component ---

type Stage = "upload" | "crop" | "result";

export default function ImageToBmpConverter() {
  const [stage, setStage] = useState<Stage>("upload");
  const [mode, setMode] = useState<ResizeMode>("crop");
  const [dither, setDither] = useState<DitherMode>("floydSteinberg");
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const loadImage = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      setError("Please select a PNG or JPG image.");
      return;
    }
    setError(null);
    setFileName(file.name.replace(/\.[^.]+$/, "") + ".bmp");
    setFileSize(file.size);

    const url = URL.createObjectURL(file);
    setImgSrc(url);

    const img = new globalThis.Image();
    img.onload = () => {
      setImgEl(img);
      setCrop(defaultCrop(img.naturalWidth, img.naturalHeight));
      setStage("crop");
    };
    img.onerror = () => setError("Failed to load image.");
    img.src = url;
  }, []);

  useEffect(() => {
    if (stage !== "crop" || !imgContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    obs.observe(imgContainerRef.current);
    return () => obs.disconnect();
  }, [stage]);

  const handleConvert = useCallback(() => {
    if (!imgEl) return;
    const canvas = renderToCanvas(imgEl, mode, crop, dither);
    const blob = createBmpBlob(canvas);
    const url = URL.createObjectURL(blob);
    setResult({
      blob,
      url,
      originalName: fileName,
      originalSize: fileSize,
    });
    setStage("result");
  }, [imgEl, mode, crop, dither, fileName, fileSize]);

  const reset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    setStage("upload");
    setImgEl(null);
    setImgSrc(null);
    setResult(null);
    setError(null);
    setMode("crop");
    setDither("floydSteinberg");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-800">
                Image to BMP Converter
              </h1>
            </div>
            {stage !== "upload" && (
              <button
                onClick={reset}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Convert PNG or JPG images to uncompressed 24-bit BMP at 480×800 pixels
            for e-ink displays.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Upload stage */}
          {stage === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadImage(file);
                }}
              />
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                Drop an image here or click to select
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG or JPG only</p>
            </div>
          )}

          {/* Crop stage */}
          {stage === "crop" && imgEl && imgSrc && (
            <div className="space-y-4">
              {/* Mode controls */}
              <div className="flex gap-1">
                <button
                  onClick={() => setMode("crop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                    mode === "crop"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Crop className="w-4 h-4" />
                  Crop
                </button>
                <button
                  onClick={() => setMode("stretch")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                    mode === "stretch"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Maximize className="w-4 h-4" />
                  Stretch
                </button>
              </div>

              {mode === "crop" && (
                <p className="text-xs text-gray-500">
                  Drag the box to choose the crop area. Drag corners to resize.
                  Aspect ratio is locked to 3:5.
                </p>
              )}
              {mode === "stretch" && (
                <p className="text-xs text-gray-500">
                  The entire image will be stretched to fit 480×800 without
                  preserving aspect ratio.
                </p>
              )}

              {/* Image with crop overlay */}
              <div
                ref={imgContainerRef}
                className="relative select-none overflow-hidden rounded border border-gray-200"
                style={{ touchAction: "none" }}
              >
                <img
                  src={imgSrc}
                  alt="Source"
                  className="block w-full h-auto"
                  draggable={false}
                />
                {mode === "crop" &&
                  containerSize.w > 0 &&
                  containerSize.h > 0 && (
                    <CropOverlay
                      crop={crop}
                      imgW={imgEl.naturalWidth}
                      imgH={imgEl.naturalHeight}
                      containerW={containerSize.w}
                      containerH={containerSize.h}
                      onCropChange={setCrop}
                    />
                  )}
              </div>

              {/* Dither gallery */}
              <DitherGallery
                img={imgEl}
                mode={mode}
                crop={crop}
                selected={dither}
                onSelect={setDither}
              />

              {/* Convert button */}
              <button
                onClick={handleConvert}
                className="w-full py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition-colors"
              >
                Convert to BMP
              </button>
            </div>
          )}

          {/* Result stage */}
          {stage === "result" && result && imgSrc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Original
                  </p>
                  <img
                    src={imgSrc}
                    alt="Original"
                    className="w-full rounded border border-gray-200 object-contain max-h-64"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Converted (480×800 BMP)
                  </p>
                  <img
                    src={result.url}
                    alt="Converted BMP"
                    className="w-full rounded border border-gray-200 object-contain max-h-64"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-indigo-50 rounded p-3">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{result.originalName}</span>
                  <span className="text-gray-500 ml-2">
                    {formatSize(result.originalSize)} &rarr;{" "}
                    {formatSize(result.blob.size)}
                  </span>
                </div>
                <a
                  href={result.url}
                  download={result.originalName}
                  className="flex items-center gap-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download BMP
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
