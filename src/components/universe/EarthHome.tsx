"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import styles from "./EarthHome.module.css";

const WORLD_HINTS = [
  { id: "music", label: "Music", x: "8%", y: "25%", depth: 0.95 },
  { id: "engineering", label: "Engineering", x: "88%", y: "22%", depth: 0.8 },
  { id: "programming", label: "Programming", x: "91%", y: "66%", depth: 1 },
  { id: "stories", label: "Stories", x: "13%", y: "72%", depth: 0.75 },
  { id: "video", label: "Video", x: "76%", y: "82%", depth: 0.68 },
  { id: "thought", label: "Thought / Faith", x: "24%", y: "14%", depth: 0.62 },
] as const;

const PRESENCE_ORBS = [
  [33, 42],
  [38, 37],
  [42, 44],
  [46, 39],
  [49, 47],
  [53, 43],
  [57, 49],
  [60, 54],
  [44, 53],
  [37, 51],
  [52, 57],
  [56, 61],
] as const;

export default function EarthHome() {
  const [rotation, setRotation] = useState({ x: -6, y: -12 });
  const [zoom, setZoom] = useState(1);
  const [introKey, setIntroKey] = useState(0);
  const [introRunning, setIntroRunning] = useState(true);
  const drag = useRef({ active: false, x: 0, y: 0 });

  useEffect(() => {
    const seen = window.localStorage.getItem("lee-universe-intro-seen");
    if (seen === "1") setIntroRunning(false);
  }, []);

  useEffect(() => {
    if (!introRunning) return;

    const timer = window.setTimeout(() => {
      setIntroRunning(false);
      window.localStorage.setItem("lee-universe-intro-seen", "1");
    }, 5600);

    return () => window.clearTimeout(timer);
  }, [introKey, introRunning]);

  const worldVisibility = useMemo(() => {
    return Math.min(1, Math.max(0.28, 1.18 - zoom));
  }, [zoom]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;

    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;

    setRotation((current) => ({
      x: Math.max(-32, Math.min(32, current.x - dy * 0.09)),
      y: current.y + dx * 0.12,
    }));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current.active = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((current) => Math.max(0.64, Math.min(1.18, current + delta)));
  }

  function replayIntro() {
    setRotation({ x: -6, y: -12 });
    setZoom(1);
    setIntroKey((key) => key + 1);
    setIntroRunning(true);
  }

  return (
    <main className={styles.page}>
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.nebula} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Lee Charles Laing home">
          LEE CHARLES LAING
        </Link>

        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#home" className={styles.activeNav}>Home</a>
          <a href="#universe">Universe</a>
          <a href="#about">About</a>
          <a href="#journal">Journal</a>
          <a href="#connect">Connect</a>
        </nav>
      </header>

      <section id="home" className={styles.hero} aria-label="Interactive universe introduction">
        <div className={styles.copy}>
          <p>IDEAS&nbsp;&nbsp;·&nbsp;&nbsp;PLACES&nbsp;&nbsp;·&nbsp;&nbsp;POSSIBILITIES</p>
          <h1>A universe of curiosity, creativity, and what&apos;s next.</h1>
        </div>

        <div
          className={styles.universeStage}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          role="application"
          aria-label="Drag to rotate Earth. Use the mouse wheel to zoom the universe view."
        >
          {WORLD_HINTS.map((world) => (
            <button
              key={world.id}
              className={styles.worldHint}
              style={{
                left: world.x,
                top: world.y,
                opacity: worldVisibility * world.depth,
                transform: `scale(${0.8 + worldVisibility * 0.28})`,
              }}
              type="button"
              aria-label={`Explore ${world.label}`}
            >
              <span className={styles.flare} />
              <span className={styles.worldLabel}>{world.label}</span>
            </button>
          ))}

          <div
            key={introKey}
            className={`${styles.earthSystem} ${introRunning ? styles.introRunning : ""}`}
            style={{
              transform: `translate3d(-50%, -46%, 0) scale(${zoom}) rotateX(${rotation.x * 0.12}deg)`,
            }}
          >
            <div className={styles.sunrise} aria-hidden="true" />
            <div
              className={styles.earth}
              style={{
                backgroundPosition: `${50 + rotation.y * 0.32}% ${48 + rotation.x * 0.15}%`,
              }}
              aria-hidden="true"
            >
              <div className={styles.earthShade} />
              <div className={styles.atmosphere} />
              <div className={styles.presenceLayer}>
                {PRESENCE_ORBS.map(([left, top], index) => (
                  <span
                    key={`${left}-${top}`}
                    className={styles.presenceOrb}
                    style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${0.55 + index * 0.26}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.explorePrompt} aria-hidden="true">
          <span className={styles.chevron} />
          <span>DRAG TO EXPLORE</span>
        </div>

        <button className={styles.replayButton} type="button" onClick={replayIntro}>
          <span className={styles.playIcon}>▶</span>
          Replay intro
        </button>
      </section>
    </main>
  );
}
