import { useEffect, useRef } from "react";
import tgpu from "typegpu";
import * as d from "typegpu/data";

const Uniforms = d.struct({
  time: d.f32,
  level: d.f32,
  hue: d.f32,
  aspect: d.f32,
  pulse: d.f32,
  _pad1: d.f32,
  _pad2: d.f32,
  _pad3: d.f32,
});

const SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  level: f32,
  hue: f32,
  aspect: f32,
  pulse: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
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

fn rot(a: f32) -> mat2x2f {
  let c = cos(a); let s = sin(a);
  return mat2x2f(c, -s, s, c);
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  var p = in.uv * 2.0 - vec2f(1.0);
  p.x = p.x * u.aspect;

  let r = length(p);
  let a = atan2(p.y, p.x);
  let t = u.time;
  let lv = clamp(u.level * 12.0, 0.0, 1.4);

  // Wobbly blob radius
  let petals = 5.0 + floor(u.hue * 4.0);
  let wob = sin(a * petals + t * 1.8) * (0.05 + lv * 0.15)
          + sin(a * (petals + 2.0) - t * 1.1) * (0.03 + lv * 0.08);
  let baseR = 0.45 + lv * 0.20 + u.pulse * 0.06;
  let radius = baseR + wob;

  let core = smoothstep(radius, radius - 0.10, r);
  let halo = smoothstep(radius + 0.55, radius, r) * (0.6 + lv * 0.4);

  // Swirling color
  let hue = fract(u.hue + t * 0.06 + r * 0.4 + a * 0.05);
  let col = hsv2rgb(hue, 0.85, 1.0);

  // Sparkles
  var sparkles = 0.0;
  let sp = p * 6.0;
  let cell = floor(sp);
  let local = fract(sp) - 0.5;
  let h = hash21(cell + vec2f(floor(t * 0.5)));
  if (h > 0.93) {
    let d2 = length(local);
    let twinkle = 0.5 + 0.5 * sin(t * 6.0 + h * 40.0);
    sparkles = smoothstep(0.12, 0.0, d2) * twinkle * (0.7 + lv * 0.6);
  }

  // Concentric ripples reacting to level
  let ripple = sin(r * 14.0 - t * 4.0) * 0.5 + 0.5;
  let rippleMask = smoothstep(0.0, 0.5, lv) * smoothstep(radius + 0.4, radius - 0.05, r);

  let finalCol = col * core
               + col * halo * 0.7
               + vec3f(1.0) * sparkles * 0.9
               + col * ripple * rippleMask * 0.25;

  let alpha = clamp(core + halo * 0.7 + sparkles * 0.5, 0.0, 1.0);

  return vec4f(finalCol, alpha);
}
`;

type Props = {
  levelRef: { current: number };
  hue: number;
  pulse: number;
};

export default function EchoVisualizer({ levelRef, hue, pulse }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef(hue);
  const pulseRef = useRef(pulse);
  hueRef.current = hue;
  pulseRef.current = pulse;

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

        const uniformBuffer = root
          .createBuffer(Uniforms)
          .$usage("uniform");

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

        const start = performance.now();
        const frame = () => {
          if (cancelled) return;
          const t = (performance.now() - start) / 1000;
          const aspect = canvas.width / Math.max(1, canvas.height);
          uniformBuffer.write({
            time: t,
            level: levelRef.current,
            hue: hueRef.current,
            aspect,
            pulse: pulseRef.current,
            _pad1: 0,
            _pad2: 0,
            _pad3: 0,
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
        console.warn("[EchoVisualizer] WebGPU init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [levelRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
