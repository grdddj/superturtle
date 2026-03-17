import React from "react";
import {
  Img,
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { PHONE_ONBOARDING_SCENE_DURATIONS, TRANSITION_DURATION } from "./constants";
import { space } from "./design";
import { headlineFont, monoFont } from "./fonts";
import type { LaunchVideoProps } from "./types";

/* ── palette ─────────────────────────────────────── */

const c = {
  bg: "#faf9f7",
  card: "#ffffff",
  border: "#e4e4e7",
  soft: "#f4f4f5",
  text: "#18181b",
  muted: "#71717a",
  dim: "#a1a1aa",
  accent: "#c4613c",
  green: "#22c55e",
  greenSoft: "#dcfce7",
  sky: "#3b82f6",
  skySoft: "#dbeafe",
  tgBlue: "#0088cc",
  dark: "#18181b",
  darkMid: "#27272a",
  darkSoft: "#3f3f46",
};

/* ── animation primitives ────────────────────────── */

const pop = (frame: number, fps: number, delay = 0, dur = 22) =>
  spring({ frame: frame - delay, fps, durationInFrames: dur, config: { damping: 14, stiffness: 160 } });

const ease = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const cl = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/* ── floating turtle (background decoration) ─────── */

const FloatingTurtle: React.FC<{
  x: number;
  y: number;
  size?: number;
  delay?: number;
  rotation?: number;
  opacity?: number;
}> = ({ x, y, size = 64, delay = 0, rotation = 0, opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const floatY = Math.sin((frame - delay) * 0.06) * 10;
  const rot = Math.sin((frame - delay) * 0.04) * 4 + rotation;
  const s = pop(frame, fps, delay, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: opacity * s,
        transform: `translateY(${floatY}px) rotate(${rot}deg) scale(${s})`,
        pointerEvents: "none",
      }}
    >
      <Img src={staticFile("robot-turtle.png")} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

/* ── pulsing dot ─────────────────────────────────── */

const Pulse: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => {
  const frame = useCurrentFrame();
  const s = 1 + Math.sin(frame * 0.15) * 0.25;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        transform: `scale(${s})`,
        boxShadow: `0 0 ${size * 2}px ${color}55`,
        flexShrink: 0,
      }}
    />
  );
};

const TypingDots: React.FC<{ color?: string }> = ({ color = c.muted }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: space(1) }}>
      {[0, 1, 2].map((dot) => {
        const wave = Math.sin(frame * 0.22 - dot * 0.9);
        return (
          <div
            key={dot}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: color,
              opacity: 0.35 + ((wave + 1) / 2) * 0.65,
              transform: `translateY(${-wave * 4}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

/* ── base canvas ─────────────────────────────────── */

const Canvas: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <AbsoluteFill
    style={{
      background: dark
        ? "radial-gradient(circle at 40% 30%, #1a2332, #0f1720 60%, #080e14)"
        : c.bg,
      color: dark ? "#e8f4ff" : c.text,
      fontFamily: headlineFont,
      overflow: "hidden",
    }}
  >
    {!dark && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 0%, rgba(196,97,60,0.05), transparent 40%), radial-gradient(circle at 80% 100%, rgba(59,130,246,0.04), transparent 30%)",
        }}
      />
    )}
    {children}
  </AbsoluteFill>
);

/* ═══════════════════════════════════════════════════
   SCENE 1 — HERO
   Big turtle, name, one-liner. Set the tone.
   ═══════════════════════════════════════════════════ */

const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoPop = pop(frame, fps, 0, 26);
  const namePop = pop(frame, fps, 8);
  const tagPop = pop(frame, fps, 18);

  return (
    <Canvas>
      <FloatingTurtle x={40} y={120} size={44} delay={10} rotation={-14} opacity={0.08} />
      <FloatingTurtle x={940} y={180} size={36} delay={20} rotation={10} opacity={0.06} />
      <FloatingTurtle x={80} y={1660} size={38} delay={30} rotation={18} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 0,
          padding: `0 ${space(8)}px`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 36,
            background: c.card,
            border: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 48px rgba(0,0,0,0.08)",
            transform: `scale(${logoPop})`,
            marginBottom: space(4),
          }}
        >
          <Img src={staticFile("robot-turtle.png")} style={{ width: 90, height: 90 }} />
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            opacity: namePop,
            transform: `translateY(${(1 - namePop) * 16}px)`,
          }}
        >
          SuperTurtle
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: space(2),
            fontSize: 30,
            color: c.muted,
            fontWeight: 500,
            opacity: tagPop,
            transform: `translateY(${(1 - tagPop) * 12}px)`,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Your coding agent on Telegram.
          <br />
          Runs in the cloud. Controlled from your phone.
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 2 — THE MOMENT (Telegram chat)
   This IS the product. User sends a message,
   agent streams back a real response.
   ═══════════════════════════════════════════════════ */

const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Timing
  const userMsgAppear = 8;
  const typingStart = 24;
  const replyStart = 40;
  const codeBlockStart = 66;
  const statusStart = 96;

  // Streaming reply text
  const replyFull = "On it. I'm scaffolding the hero, features, and pricing sections now.";
  const replyChars = Math.max(0, Math.floor((frame - replyStart) * 1.55));
  const replyText = replyFull.slice(0, replyChars);
  const typingActive = frame >= typingStart && frame < replyStart;
  const headerStatusColor = typingActive ? c.tgBlue : c.green;
  const headerStatusText = typingActive ? "typing..." : "online";

  // Streaming code
  const codeLines = [
    "src/app/page.tsx",
    "src/components/Hero.tsx",
    "src/components/Features.tsx",
    "tailwind.config.ts",
  ];
  const codeProgress = Math.max(0, Math.floor((frame - codeBlockStart) / 8));

  return (
    <Canvas>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(232,244,255,0.92) 0%, rgba(248,251,255,0.98) 54%, rgba(243,246,250,1) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.32,
          backgroundImage:
            "radial-gradient(rgba(59,130,246,0.14) 1.5px, transparent 1.5px), radial-gradient(rgba(196,97,60,0.08) 1px, transparent 1px)",
          backgroundPosition: "0 0, 16px 16px",
          backgroundSize: "32px 32px",
        }}
      />
      <FloatingTurtle x={920} y={100} size={40} delay={8} rotation={12} opacity={0.07} />
      <FloatingTurtle x={50} y={1640} size={36} delay={16} rotation={-10} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: `${space(8)}px ${space(4)}px ${space(6)}px`,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space(2),
            padding: `${space(2)}px ${space(3)}px`,
            marginBottom: space(4),
            borderRadius: 28,
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.72)",
            boxShadow: "0 12px 36px rgba(17,24,39,0.06)",
            opacity: cl(frame, 0, 8, 0, 1),
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: c.soft,
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img src={staticFile("robot-turtle.png")} style={{ width: 30, height: 30 }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>SuperTurtle</div>
            <div
              style={{
                fontSize: 15,
                color: headerStatusColor,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: space(1),
              }}
            >
              <Pulse color={headerStatusColor} size={6} />
              {headerStatusText}
            </div>
          </div>
        </div>

        {/* Chat thread */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: `0 ${space(1)}px`,
          }}
        >
          <div
            style={{
              alignSelf: "center",
              marginBottom: space(3),
              padding: `${space(1)}px ${space(2)}px`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.84)",
              border: `1px solid ${c.border}`,
              color: c.muted,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.2,
              opacity: cl(frame, 2, 10, 0, 1),
            }}
          >
            Today
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space(3),
            }}
          >
            {/* User message — right aligned, blue */}
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "78%",
                opacity: cl(frame, userMsgAppear, userMsgAppear + 8, 0, 1),
                transform: `translateY(${ease(frame, userMsgAppear, userMsgAppear + 10, 20, 0)}px)`,
              }}
            >
              <div
                style={{
                  background: "linear-gradient(180deg, #2aabee 0%, #1d9dd9 100%)",
                  color: "#fff",
                  borderRadius: "26px 26px 10px 26px",
                  padding: `${space(2)}px ${space(3)}px`,
                  fontSize: 22,
                  lineHeight: 1.38,
                  fontWeight: 500,
                  display: "flex",
                  flexDirection: "column",
                  gap: space(1),
                  boxShadow: "0 10px 24px rgba(29,157,217,0.18)",
                }}
              >
                <div>Build me a landing page for SuperTurtle with hero, features, and pricing.</div>
                <div
                  style={{
                    alignSelf: "flex-end",
                    display: "flex",
                    alignItems: "center",
                    gap: space(1),
                    fontSize: 13,
                    color: "rgba(255,255,255,0.74)",
                    fontWeight: 600,
                  }}
                >
                  <span>9:41 AM</span>
                  <span style={{ letterSpacing: -1 }}>✓✓</span>
                </div>
              </div>
            </div>

            {/* Typing indicator */}
            {typingActive && (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "36%",
                  opacity:
                    cl(frame, typingStart, typingStart + 6, 0, 1) *
                    cl(frame, replyStart - 4, replyStart, 1, 0),
                  transform: `translateY(${ease(frame, typingStart, typingStart + 10, 16, 0)}px)`,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.94)",
                    border: `1px solid ${c.border}`,
                    borderRadius: "26px 26px 26px 10px",
                    padding: `${space(2)}px ${space(3)}px`,
                    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                  }}
                >
                  <TypingDots color="#90a4b8" />
                </div>
              </div>
            )}

            {/* Bot reply — left aligned, white */}
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "84%",
                opacity: cl(frame, replyStart, replyStart + 6, 0, 1),
                transform: `translateY(${ease(frame, replyStart, replyStart + 10, 18, 0)}px)`,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.96)",
                  border: `1px solid ${c.border}`,
                  borderRadius: "26px 26px 26px 10px",
                  padding: `${space(2)}px ${space(3)}px`,
                  boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: space(2),
                }}
              >
                {/* Streaming text */}
                <div style={{ fontSize: 21, lineHeight: 1.45, color: c.text, minHeight: 62 }}>
                  {replyText}
                  {replyChars < replyFull.length && (
                    <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0, color: c.accent }}>|</span>
                  )}
                </div>

                {/* Code file list — appears after text */}
                {frame >= codeBlockStart && (
                  <div
                    style={{
                      borderRadius: 18,
                      background: "#111827",
                      padding: `${space(2)}px ${space(3)}px`,
                      opacity: cl(frame, codeBlockStart, codeBlockStart + 8, 0, 1),
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {codeLines.slice(0, codeProgress).map((line, i) => (
                      <div
                        key={line}
                        style={{
                          fontFamily: monoFont,
                          fontSize: 16,
                          color: i < codeProgress - 1 ? c.green : "#cbd5e1",
                          lineHeight: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: space(1),
                          opacity: cl(frame, codeBlockStart + i * 8, codeBlockStart + i * 8 + 6, 0, 1),
                        }}
                      >
                        <span style={{ color: i < codeProgress - 1 ? c.green : "#64748b" }}>
                          {i < codeProgress - 1 ? "✓" : "▸"}
                        </span>
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status badge */}
                {frame >= statusStart && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space(1),
                      opacity: cl(frame, statusStart, statusStart + 8, 0, 1),
                    }}
                  >
                    <Pulse color={c.green} size={8} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: c.green }}>4 files created</span>
                    <span style={{ fontSize: 15, color: c.dim }}>in 12s</span>
                  </div>
                )}

                <div
                  style={{
                    alignSelf: "flex-end",
                    display: "flex",
                    alignItems: "center",
                    gap: space(1),
                    fontSize: 13,
                    color: c.dim,
                    fontWeight: 600,
                  }}
                >
                  <span>9:42 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 3 — ARCHITECTURE
   Phone → Telegram → Cloud → Code
   Clean animated diagram. Show what's happening.
   ═══════════════════════════════════════════════════ */

const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nodes = [
    {
      icon: "📱",
      label: "You",
      meta: "Local input",
      badge: "Prompt",
      delay: 4,
      accent: "rgba(143, 217, 255, 0.18)",
      edge: "rgba(143, 217, 255, 0.46)",
    },
    {
      icon: "✈️",
      label: "Telegram",
      meta: "Message bus",
      badge: "Live",
      delay: 12,
      accent: "rgba(59, 130, 246, 0.2)",
      edge: "rgba(59, 130, 246, 0.48)",
    },
    {
      icon: "☁️",
      label: "Cloud Sandbox",
      meta: "Remote runtime",
      badge: "Warm",
      delay: 20,
      accent: "rgba(118, 247, 191, 0.18)",
      edge: "rgba(118, 247, 191, 0.46)",
    },
    {
      icon: "🐢",
      label: "Agent",
      meta: "Execution loop",
      badge: "Coding",
      delay: 28,
      accent: "rgba(196, 97, 60, 0.2)",
      edge: "rgba(255, 139, 106, 0.5)",
    },
  ];

  const connectorHeight = space(7);
  const flowStart = 36;

  return (
    <Canvas dark>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 22%, rgba(59,130,246,0.22), transparent 28%), radial-gradient(circle at 50% 70%, rgba(118,247,191,0.14), transparent 34%), radial-gradient(circle at 18% 82%, rgba(255,255,255,0.06), transparent 24%), linear-gradient(180deg, rgba(4,10,18,0.28), rgba(3,8,14,0.74))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 360,
          width: 480,
          height: 980,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, rgba(143,217,255,0.1), rgba(118,247,191,0.08))",
          filter: "blur(110px)",
          opacity: 0.7,
        }}
      />
      <FloatingTurtle x={52} y={124} size={42} delay={6} rotation={-10} opacity={0.04} />
      <FloatingTurtle x={944} y={1632} size={36} delay={18} rotation={14} opacity={0.04} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${space(6)}px`,
          gap: space(5),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: space(2),
            opacity: cl(frame, 0, 12, 0, 1),
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: -1.6,
              lineHeight: 1.05,
            }}
          >
            How it works
          </div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(232,244,255,0.58)",
              fontWeight: 500,
              letterSpacing: -0.2,
            }}
          >
            Telegram routes each request to your cloud turtle.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            width: "100%",
            maxWidth: 520,
          }}
        >
          {nodes.map((node, i) => {
            const p = pop(frame, fps, node.delay);
            const isLast = i === nodes.length - 1;
            const cycle = ((frame - flowStart - i * 7) % 44 + 44) % 44;
            const pulseTop = (cycle / 44) * (connectorHeight - 18);
            const flowVisible = frame >= flowStart + i * 3;

            return (
              <React.Fragment key={node.label}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: space(3),
                    width: "100%",
                    padding: `${space(3)}px ${space(4)}px`,
                    borderRadius: 28,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow:
                      "0 22px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)",
                    backdropFilter: "blur(8px)",
                    opacity: p,
                    transform: `translateY(${(1 - p) * 18}px) scale(${0.96 + p * 0.04})`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: space(2) }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 22,
                        background: `linear-gradient(180deg, ${node.accent}, rgba(255,255,255,0.06))`,
                        border: `1px solid ${node.edge}`,
                        boxShadow: `0 16px 30px ${node.accent}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 32,
                        flexShrink: 0,
                      }}
                    >
                      {node.icon}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: space(1) }}>
                      <div
                        style={{
                          fontFamily: monoFont,
                          fontSize: 13,
                          letterSpacing: 1.4,
                          textTransform: "uppercase",
                          color: "rgba(232,244,255,0.48)",
                        }}
                      >
                        {node.meta}
                      </div>
                      <div
                        style={{
                          fontSize: 29,
                          fontWeight: 700,
                          letterSpacing: -0.8,
                          color: "#f5fbff",
                        }}
                      >
                        {node.label}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space(1),
                      padding: `${space(1)}px ${space(2)}px`,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(232,244,255,0.7)",
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: node.edge,
                        boxShadow: `0 0 14px ${node.edge}`,
                      }}
                    />
                    <span>{node.badge}</span>
                  </div>
                </div>

                {!isLast && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      width: "100%",
                      padding: `${space(2)}px 0`,
                    }}
                  >
                    <div
                      style={{
                        width: 2,
                        height: connectorHeight,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                        borderRadius: 999,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(143,217,255,0.12), rgba(118,247,191,0.18))",
                          opacity: cl(frame, 18 + i * 6, 28 + i * 6, 0, 1),
                        }}
                      />
                      {flowVisible && (
                        <div
                          style={{
                            position: "absolute",
                            left: -1,
                            top: pulseTop,
                            width: 4,
                            height: 18,
                            borderRadius: 999,
                            background:
                              "linear-gradient(180deg, rgba(143,217,255,0.92), rgba(118,247,191,0.92))",
                            boxShadow: "0 0 18px rgba(143,217,255,0.42)",
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 4 — TELEPORT
   The differentiator. Local fades → cloud lights up →
   Telegram stays connected.
   ═══════════════════════════════════════════════════ */

const TeleportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgePop = pop(frame, fps, 0, 20);
  const cardPop = pop(frame, fps, 10, 24);
  const transfer = Math.min(
    1,
    Math.max(
      0,
      spring({
        frame: frame - 18,
        fps,
        durationInFrames: 38,
        config: { damping: 18, stiffness: 110, mass: 0.9 },
      })
    )
  );
  const localOp = 1 - transfer * 0.72;
  const cloudOp = 0.38 + transfer * 0.62;
  const beamHead = interpolate(transfer, [0, 1], [0.08, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beamTail = interpolate(transfer, [0, 1], [0, 0.66], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beamSpan = Math.max(0.14, beamHead - beamTail);
  const beamSweepOpacity = 1 - cl(frame, 54, 68, 0, 0.9);
  const beamDotOpacity = cl(frame, 20, 28, 0, 1) * (1 - cl(frame, 54, 66, 0, 1));
  const beamSettle = ease(frame, 42, 60, 0, 1);
  const cloudActive = ease(frame, 46, 64, 0, 1);

  return (
    <Canvas>
      <FloatingTurtle x={50} y={100} size={46} delay={4} rotation={-8} opacity={0.08} />
      <FloatingTurtle x={920} y={1600} size={38} delay={16} rotation={16} opacity={0.06} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${space(6)}px`,
          gap: space(4),
        }}
      >
        {/* Command badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space(1.5),
            fontFamily: monoFont,
            fontSize: 28,
            fontWeight: 700,
            color: c.accent,
            background: "linear-gradient(180deg, #ffe9e0 0%, #ffd9cf 100%)",
            border: "1px solid rgba(196,97,60,0.18)",
            padding: `${space(1.25)}px ${space(3)}px`,
            borderRadius: 999,
            boxShadow: "0 10px 24px rgba(196,97,60,0.12)",
            opacity: badgePop,
            transform: `translateY(${(1 - badgePop) * 10}px) scale(${0.94 + badgePop * 0.06})`,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: c.accent,
              boxShadow: "0 0 12px rgba(196,97,60,0.28)",
              flexShrink: 0,
            }}
          />
          /teleport
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: -1.4,
            textAlign: "center",
            lineHeight: 1.15,
            opacity: cl(frame, 4, 14, 0, 1),
          }}
        >
          Move to the cloud.
          <br />
          <span style={{ color: c.muted }}>Stay on Telegram.</span>
        </div>

        {/* Diagram: Local ← beam → Cloud, Telegram below */}
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            borderRadius: 32,
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)",
            border: `1px solid ${c.border}`,
            padding: `${space(4)}px ${space(4)}px`,
            boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
            opacity: cl(frame, 10, 18, 0, 1),
            transform: `translateY(${(1 - cardPop) * 18}px) scale(${0.97 + cardPop * 0.03})`,
          }}
        >
          {/* Top row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: space(3),
              padding: `0 ${space(1)}px`,
            }}
          >
            {/* Local */}
            <div
              style={{
                width: 144,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: space(1),
                opacity: localOp,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: c.soft,
                  border: `2px solid ${transfer < 0.48 ? c.sky : c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                }}
              >
                💻
              </div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Your PC</span>
            </div>

            {/* Beam */}
            <div
              style={{
                width: 232,
                height: 24,
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 8,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(59,130,246,0.08), rgba(34,197,94,0.08))",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${c.sky}, ${c.green})`,
                    opacity: beamSettle,
                    transform: `scaleX(${beamSettle})`,
                    transformOrigin: "left center",
                    boxShadow: beamSettle > 0 ? "0 0 18px rgba(34,197,94,0.18)" : "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${beamTail * 100}%`,
                    width: `${beamSpan * 100}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${c.sky}, ${c.green})`,
                    opacity: beamSweepOpacity,
                    boxShadow: "0 0 18px rgba(34,197,94,0.32)",
                  }}
                />
              </div>
              {/* Traveling dot */}
              <div
                style={{
                  position: "absolute",
                  left: `${beamHead * 100}%`,
                  top: "50%",
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: c.green,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 18px rgba(34,197,94,0.5), 0 0 32px rgba(59,130,246,0.18)",
                  opacity: beamDotOpacity,
                }}
              />
            </div>

            {/* Cloud */}
            <div
              style={{
                width: 144,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: space(1),
                opacity: cloudOp,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: cloudActive > 0.45 ? c.greenSoft : c.soft,
                  border: `2px solid ${cloudActive > 0.45 ? c.green : c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  boxShadow: cloudActive > 0.2 ? "0 10px 26px rgba(34,197,94,0.14)" : "none",
                }}
              >
                ☁️
              </div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>E2B Sandbox</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: c.border, margin: `${space(3)}px 0` }} />

          {/* Telegram — stays connected */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space(2) }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: `${c.tgBlue}12`,
                border: `1px solid ${c.tgBlue}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              ✈️
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Telegram</div>
              <div
                style={{
                  fontSize: 15,
                  color: c.green,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: space(1),
                }}
              >
                <Pulse color={c.green} size={6} />
                Always connected
              </div>
            </div>
          </div>
        </div>

        {/* One-liner */}
        <div
          style={{
            fontSize: 20,
            color: c.muted,
            textAlign: "center",
            fontWeight: 500,
            opacity: cl(frame, 60, 72, 0, 1),
            transform: `translateY(${cl(frame, 60, 72, 10, 0)}px)`,
          }}
        >
          One command. Zero downtime.
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   SCENE 5 — CLOSE
   Turtle, tagline, CTA.
   ═══════════════════════════════════════════════════ */

const CloseScene: React.FC<Pick<LaunchVideoProps, "cta">> = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tPop = pop(frame, fps, 0, 24);
  const tagPop = pop(frame, fps, 10);

  return (
    <Canvas>
      <FloatingTurtle x={30} y={100} size={56} delay={0} rotation={-14} opacity={0.12} />
      <FloatingTurtle x={920} y={140} size={46} delay={6} rotation={10} opacity={0.1} />
      <FloatingTurtle x={60} y={1600} size={40} delay={12} rotation={18} opacity={0.08} />
      <FloatingTurtle x={900} y={1640} size={44} delay={18} rotation={-12} opacity={0.08} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 0,
          padding: `0 ${space(8)}px`,
        }}
      >
        {/* Big turtle */}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 999,
            background: c.greenSoft,
            border: `3px solid ${c.green}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${tPop})`,
            boxShadow: "0 16px 48px rgba(34,197,94,0.2)",
            marginBottom: space(4),
          }}
        >
          <Img src={staticFile("robot-turtle.png")} style={{ width: 82, height: 82 }} />
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            letterSpacing: -1.6,
            textAlign: "center",
            lineHeight: 1.15,
            opacity: tagPop,
            transform: `translateY(${(1 - tagPop) * 16}px)`,
          }}
        >
          {cta}
        </div>

        {/* Three proof points */}
        <div
          style={{
            marginTop: space(4),
            display: "flex",
            gap: space(3),
            justifyContent: "center",
          }}
        >
          {[
            { label: "Telegram", delay: 16 },
            { label: "Cloud", delay: 20 },
            { label: "Autonomous", delay: 24 },
          ].map(({ label, delay }) => {
            const p = pop(frame, fps, delay);
            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: space(1),
                  opacity: p,
                  transform: `scale(${p})`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: c.green,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 700,
                    boxShadow: `0 4px 12px ${c.green}44`,
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: c.muted }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: space(5),
            width: "80%",
            height: space(8),
            borderRadius: 16,
            background: c.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            boxShadow: "0 6px 24px rgba(196,97,60,0.3)",
            opacity: cl(frame, 30, 38, 0, 1),
            transform: `translateY(${cl(frame, 30, 38, 12, 0)}px)`,
          }}
        >
          Get started
        </div>
      </div>
    </Canvas>
  );
};

/* ═══════════════════════════════════════════════════
   COMPOSITION
   ═══════════════════════════════════════════════════ */

export const PhoneLaunchVideo: React.FC<LaunchVideoProps> = (props) => {
  const D = PHONE_ONBOARDING_SCENE_DURATIONS;
  return (
    <AbsoluteFill style={{ fontFamily: headlineFont }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.hero}>
          <HeroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.chat}>
          <ChatScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.architecture}>
          <ArchitectureScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.teleport}>
          <TeleportScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={D.close}>
          <CloseScene cta={props.cta} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
