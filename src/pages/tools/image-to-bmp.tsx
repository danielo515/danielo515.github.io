import { Image, Download, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const TARGET_WIDTH = 480;
const TARGET_HEIGHT = 800;

type ConversionResult = {
  blob: Blob;
  url: string;
  originalName: string;
  originalSize: number;
};

function createBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows are padded to 4-byte boundaries
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (info header) + pixel data

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BMP File Header (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true); // reserved
  view.setUint32(10, 54, true); // pixel data offset

  // DIB Header - BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = bottom-up
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // 24-bit color depth
  view.setUint32(30, 0, true); // no compression (BI_RGB)
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 2835, true); // horizontal resolution (72 DPI)
  view.setInt32(42, 2835, true); // vertical resolution (72 DPI)
  view.setUint32(46, 0, true); // colors in palette
  view.setUint32(50, 0, true); // important colors

  // Pixel data (bottom-up, BGR order)
  const pixelOffset = 54;
  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y; // BMP stores bottom-up
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = pixelOffset + bmpRow * rowSize + x * 3;
      view.setUint8(dstIdx, data[srcIdx + 2]!); // B
      view.setUint8(dstIdx + 1, data[srcIdx + 1]!); // G
      view.setUint8(dstIdx + 2, data[srcIdx]!); // R
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

function resizeAndConvert(file: File): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext("2d")!;

      // Fill with white background (for transparent PNGs)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      // Calculate scaling to cover the target area while maintaining aspect ratio
      const scale = Math.max(
        TARGET_WIDTH / img.width,
        TARGET_HEIGHT / img.height
      );
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      const offsetX = (TARGET_WIDTH - scaledW) / 2;
      const offsetY = (TARGET_HEIGHT - scaledH) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

      const blob = createBmpBlob(canvas);
      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, "");

      resolve({
        blob,
        url,
        originalName: baseName + ".bmp",
        originalSize: file.size,
      });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageToBmpConverter() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      setError("Please select a PNG or JPG image.");
      return;
    }
    setError(null);
    setConverting(true);
    setPreview(URL.createObjectURL(file));

    try {
      const converted = await resizeAndConvert(file);
      setResult(converted);
    } catch {
      setError("Failed to convert image. Please try a different file.");
    } finally {
      setConverting(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const reset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (preview) URL.revokeObjectURL(preview);
    setResult(null);
    setPreview(null);
    setError(null);
    setConverting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-800">
                Image to BMP Converter
              </h1>
            </div>
            {(result || preview) && (
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
            Convert PNG or JPG images to uncompressed 24-bit BMP at 480x800
            pixels.
          </p>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
                if (file) handleFile(file);
              }}
            />
            <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Drop an image here or click to select
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG or JPG only</p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {converting && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              Converting...
            </div>
          )}

          {/* Preview and result */}
          {preview && result && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Original
                  </p>
                  <img
                    src={preview}
                    alt="Original"
                    className="w-full rounded border border-gray-200 object-contain max-h-64"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Converted (480x800 BMP)
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
