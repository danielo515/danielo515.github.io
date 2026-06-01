import { useEffect, useRef } from "react";
import tgpu from "typegpu";
import * as d from "typegpu/data";

const NUM_BINS = 64;
const NUM_VEC4 = NUM_BINS / 4;

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
  return mix(getBin(i0), getBin(i1), smoothstep(0.0, 1.0, t));
}

fn sampleBinsSym(angleNorm: f32) -> f32 {
  let a = abs(angleNorm - 0.5) * 2.0;
  return sampleBins(a);
}

fn avgLow() -> f32 {
  var s = 0.0;
  for (var i = 0u; i < 16u; i = i + 1u) {
    s = s + getBin(i);
  }
  return s / 16.0;
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

const PI: f32 = 3.14159265;
const TAU: f32 = 6.28318530;

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  let asp = max(0.0001, u.aspect);
  var p = in.uv * 2.0 - vec2f(1.0);
  if (asp >= 1.0) {
    p.x = p.x * asp;
  } else {
    p.y = p.y / asp;
  }
  let r = length(p);
  let a = atan2(p.y, p.x);
  let aN = a / TAU + 0.5;
  let t = u.time;
  let live = u.liveness;
  let energy = avgLow();

  // FFT-driven petal radius
  let bin = sampleBinsSym(aN);
  let baseR = 0.55 + energy * 0.05;
  let wob = sin(aN * TAU * 5.0 + t * 1.6) * (0.02 + live * 0.025)
          + sin(aN * TAU * 9.0 - t * 1.1) * (0.012);
  let radius = baseR + bin * 0.22 + wob;

  // Main blob silhouette
  let core = smoothstep(radius, radius - 0.10, r);
  let halo = smoothstep(radius + 0.55, radius, r) * (0.55 + live * 0.4);

  // Bright inner pulse
  let innerR = 0.20 + bin * 0.08 + sin(t * 2.0) * 0.01 * live;
  let innerCore = smoothstep(innerR, innerR - 0.10, r);

  // Concentric rings driven by FFT
  var rings = 0.0;
  for (var i: u32 = 0u; i < 4u; i = i + 1u) {
    let fi = f32(i);
    let rr0 = 0.72 + fi * 0.10;
    let ringBin = sampleBins(fract(aN + fi * 0.137));
    let rr = rr0 + ringBin * 0.07 + sin(t * (0.6 + fi * 0.25) + aN * TAU) * 0.012;
    let rw = 0.009 + ringBin * 0.018;
    rings = rings + exp(-pow((r - rr) / rw, 2.0)) * (0.25 + ringBin * 0.75);
  }

  // Color
  let hue = fract(u.hue + r * 0.35 + t * 0.07 + aN * 0.08);
  let col = hsv2rgb(hue, 0.85, 1.0);
  let innerCol = hsv2rgb(fract(hue + 0.1), 0.45, 1.0);

  // Orbiting sparkles
  var spark = 0.0;
  let driftX = t * 1.2;
  let driftY = t * 0.4;
  let cell = floor(p * 14.0 + vec2f(driftX, driftY));
  let local = fract(p * 14.0 + vec2f(driftX, driftY)) - 0.5;
  let h = hash21(cell);
  if (h > 0.92) {
    let near = exp(-pow((r - radius - 0.04) / 0.16, 2.0));
    let d2 = length(local);
    spark = exp(-pow(d2 / 0.16, 2.0)) * near
          * (0.6 + 0.4 * sin(t * 6.0 + h * 30.0))
          * (0.5 + live * 0.6);
  }

  // Background slow swirl (very subtle)
  let swirlA = a + r * 1.5 + t * 0.3;
  let swirl = (sin(swirlA * 3.0) * 0.5 + 0.5) * smoothstep(1.6, 0.6, r) * 0.08 * live;

  let finalCol = innerCol * innerCore * 1.1
               + col * core
               + col * halo * 0.7
               + col * rings
               + vec3f(1.0) * spark * 1.3
               + col * swirl;

  let alpha = clamp(
    innerCore + core * 0.95 + halo * 0.75 + rings * 0.7 + spark + swirl,
    0.0, 1.0
  );

  let fade = mix(0.4, 1.0, live);
  return vec4f(finalCol * fade, alpha * fade);
}
`;

type Props = {
  freqDataRef: { current: Uint8Array };
  hue: number;
  active: boolean;
};

export default function EchoAura({ freqDataRef, hue, active }: Props) {
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
            smoothed[i] = v > prev ? v : prev * 0.86 + v * 0.14;
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
        console.warn("[EchoAura] WebGPU init failed:", e);
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
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
