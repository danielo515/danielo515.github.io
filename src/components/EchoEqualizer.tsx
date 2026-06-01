import { useEffect, useRef } from "react";
import tgpu from "typegpu";
import * as d from "typegpu/data";

const NUM_BINS = 64;
const NUM_VEC4 = NUM_BINS / 4; // 16

const Uniforms = d.struct({
  time: d.f32,
  hue: d.f32,
  aspect: d.f32,
  liveness: d.f32,
  bins: d.arrayOf(d.vec4f, NUM_VEC4),
});

const SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  hue: f32,
  aspect: f32,
  liveness: f32,
  bins: array<vec4f, 16>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VsOut {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var out: VsOut;
  let p = positions[i];
  out.pos = vec4f(p, 0.0, 1.0);
  out.uv = vec2f((p.x + 1.0) * 0.5, 1.0 - (p.y + 1.0) * 0.5);
  return out;
}

fn getBin(i: u32) -> f32 {
  let g = i / 4u;
  let s = i % 4u;
  let v = u.bins[g];
  if (s == 0u) { return v.x; }
  if (s == 1u) { return v.y; }
  if (s == 2u) { return v.z; }
  return v.w;
}

fn sampleBins(x: f32) -> f32 {
  let nb = f32(64);
  let f = clamp(x, 0.0, 1.0) * (nb - 1.0);
  let i0 = u32(floor(f));
  let i1 = min(i0 + 1u, u32(nb - 1.0));
  let t = fract(f);
  let v0 = getBin(i0);
  let v1 = getBin(i1);
  return mix(v0, v1, smoothstep(0.0, 1.0, t));
}

fn hash21(p: vec2f) -> f32 {
  let q = fract(p * vec2f(123.34, 456.21));
  let r = q + dot(q, q + 45.32);
  return fract(r.x * r.y);
}

fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3f {
  let k = vec3f(1.0, 2.0/3.0, 1.0/3.0);
  let p = abs(fract(vec3f(h) + k) * 6.0 - vec3f(3.0));
  return v * mix(vec3f(1.0), clamp(p - vec3f(1.0), vec3f(0.0), vec3f(1.0)), s);
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  let uv = in.uv;
  let p = uv * 2.0 - vec2f(1.0);
  let t = u.time;

  // Sample current bar height (smooth interpolation across bins)
  let baseH = sampleBins(uv.x);
  // Slight horizontal smoothing by averaging a small window
  let h = baseH * 0.85;

  let distY = abs(p.y);

  // Filled mirrored waveform region
  let fillEdge = smoothstep(h + 0.02, h - 0.02, distY);

  // Glowing top/bottom line on the silhouette
  let lineW = 0.025 + h * 0.025;
  let line = exp(-pow((distY - h) / lineW, 2.0));

  // Soft halo above the waveform
  let halo = exp(-pow(max(distY - h, 0.0) / 0.18, 2.0)) * 0.45;

  // Color: hue cycles with bar position + time
  let hue = fract(u.hue + uv.x * 0.6 + t * 0.08);
  let col = hsv2rgb(hue, 0.85, 1.0);
  let colTop = hsv2rgb(fract(hue + 0.07), 0.6, 1.0);

  // Vertical gradient inside the fill
  let yGrad = 1.0 - smoothstep(0.0, h, distY) * 0.5;
  let fillCol = mix(col, colTop, smoothstep(0.0, h, distY)) * yGrad;

  // Sparkles that follow the waveform crest
  let sx = floor(uv.x * 48.0);
  let crest = sampleBins(sx / 48.0);
  let sparkSeed = hash21(vec2f(sx, floor(t * 6.0 + sx * 0.3)));
  let sparkY = crest + 0.04 + sparkSeed * 0.06;
  let sparkXf = fract(uv.x * 48.0) - 0.5;
  let sparkDist = vec2f(sparkXf * 0.6, (distY - sparkY) * 1.4);
  let sparkR = length(sparkDist);
  let sparkOn = step(0.88, sparkSeed) * step(0.08, crest);
  let spark = exp(-pow(sparkR / 0.07, 2.0)) * sparkOn;

  // Background scrolling stars (subtle)
  let bgUv = vec2f(uv.x + t * 0.05, uv.y);
  let bgCell = floor(bgUv * vec2f(60.0, 30.0));
  let bgLocal = fract(bgUv * vec2f(60.0, 30.0)) - 0.5;
  let bgH = hash21(bgCell);
  var bg = 0.0;
  if (bgH > 0.985) {
    bg = exp(-pow(length(bgLocal) / 0.18, 2.0)) * 0.4;
  }

  // Idle pulse: gentle line at y=0 when not active
  let idleLine = exp(-pow(p.y / 0.018, 2.0)) * (1.0 - u.liveness) * 0.4;

  let totalCol = fillCol * fillEdge
               + col * line * 1.6
               + col * halo
               + vec3f(1.0) * spark * 1.2
               + col * idleLine
               + vec3f(0.9, 0.9, 1.0) * bg;

  let alpha = clamp(
    fillEdge * 0.85
    + line * 0.95
    + halo * 0.7
    + spark
    + idleLine * 0.6
    + bg,
    0.0, 1.0
  );

  let fade = mix(0.45, 1.0, u.liveness);
  return vec4f(totalCol * fade, alpha * fade);
}
`;

type Props = {
  freqDataRef: { current: Uint8Array };
  hue: number;
  active: boolean;
};

export default function EchoEqualizer({ freqDataRef, hue, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef(hue);
  const activeRef = useRef(active ? 1 : 0);
  hueRef.current = hue;
  activeRef.current = active ? 1 : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof navigator === "undefined" || !("gpu" in navigator)) return;

    let raf = 0;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      try {
        const root = await tgpu.init();
        if (cancelled) {
          root.destroy();
          return;
        }
        const device = root.device;
        const ctx = canvas.getContext("webgpu") as GPUCanvasContext | null;
        if (!ctx) {
          root.destroy();
          return;
        }
        const format = navigator.gpu!.getPreferredCanvasFormat();
        ctx.configure({ device, format, alphaMode: "premultiplied" });

        const uniformBuffer = root.createBuffer(Uniforms).$usage("uniform");

        const module = device.createShaderModule({ code: SHADER });
        const pipeline = device.createRenderPipeline({
          layout: "auto",
          vertex: { module, entryPoint: "vs" },
          fragment: {
            module,
            entryPoint: "fs",
            targets: [
              {
                format,
                blend: {
                  color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add",
                  },
                  alpha: {
                    srcFactor: "one",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add",
                  },
                },
              },
            ],
          },
          primitive: { topology: "triangle-list" },
        });

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: { buffer: root.unwrap(uniformBuffer) },
            },
          ],
        });

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
          const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        // Smoothed bins (decay)
        const smoothed = new Float32Array(NUM_BINS);
        const start = performance.now();

        const frame = () => {
          if (cancelled) return;
          const t = (performance.now() - start) / 1000;
          const aspect = canvas.width / Math.max(1, canvas.height);

          const raw = freqDataRef.current;
          for (let i = 0; i < NUM_BINS; i++) {
            const v = (raw[i] ?? 0) / 255;
            const prev = smoothed[i]!;
            smoothed[i] = v > prev ? v : prev * 0.85 + v * 0.15;
          }

          const bins: ReturnType<typeof d.vec4f>[] = [];
          for (let i = 0; i < NUM_VEC4; i++) {
            bins.push(
              d.vec4f(
                smoothed[i * 4]!,
                smoothed[i * 4 + 1]!,
                smoothed[i * 4 + 2]!,
                smoothed[i * 4 + 3]!
              )
            );
          }

          uniformBuffer.write({
            time: t,
            hue: hueRef.current,
            aspect,
            liveness: activeRef.current,
            bins,
          });

          const encoder = device.createCommandEncoder();
          const view = ctx.getCurrentTexture().createView();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view,
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
              },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(3);
          pass.end();
          device.queue.submit([encoder.finish()]);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          try {
            root.destroy();
          } catch {}
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[EchoEqualizer] WebGPU init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [freqDataRef]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-20 w-full"
      aria-hidden="true"
    />
  );
}
