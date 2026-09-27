"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import styles from "./EarthHome.module.css";

type RotationState = { x: number; y: number };
type WorldHint = { id: string; label: string; lat: number; lon: number; orbitRadius: number };
type PresenceOrb = { id: string; lat: number; lon: number };

const WORLD_HINTS: WorldHint[] = [
  { id: "music", label: "Music", lat: 24, lon: -90, orbitRadius: 59 },
  { id: "engineering", label: "Engineering", lat: 20, lon: 18, orbitRadius: 61 },
  { id: "programming", label: "Programming", lat: -6, lon: 86, orbitRadius: 60 },
  { id: "stories", label: "Stories", lat: -18, lon: -126, orbitRadius: 58 },
  { id: "video", label: "Video", lat: -30, lon: 48, orbitRadius: 59 },
  { id: "thought", label: "Thought / Faith", lat: 42, lon: -22, orbitRadius: 57 },
];

const PRESENCE_ORBS: PresenceOrb[] = [
  { id: "michigan", lat: 43.7, lon: -84.5 },
  { id: "nashville", lat: 36.1, lon: -86.7 },
  { id: "los-angeles", lat: 34.1, lon: -118.2 },
  { id: "sao-paulo", lat: -23.5, lon: -46.6 },
  { id: "london", lat: 51.5, lon: -0.1 },
  { id: "lagos", lat: 6.5, lon: 3.3 },
  { id: "cape-town", lat: -33.9, lon: 18.4 },
  { id: "dubai", lat: 25.2, lon: 55.3 },
  { id: "mumbai", lat: 19.1, lon: 72.8 },
  { id: "tokyo", lat: 35.7, lon: 139.7 },
  { id: "manila", lat: 14.6, lon: 121 },
  { id: "sydney", lat: -33.9, lon: 151.2 },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function normalizeAngle(value: number) {
  let next = value % 360;
  if (next < 0) next += 360;
  return next;
}

function projectSpherePoint(lat: number, lon: number, rotation: RotationState, radiusPercent: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon + rotation.y) * Math.PI) / 180;
  const tiltRad = (rotation.x * Math.PI) / 180;

  const baseX = Math.cos(latRad) * Math.sin(lonRad);
  const baseY = Math.sin(latRad);
  const baseZ = Math.cos(latRad) * Math.cos(lonRad);
  const rotatedY = baseY * Math.cos(tiltRad) - baseZ * Math.sin(tiltRad);
  const rotatedZ = baseY * Math.sin(tiltRad) + baseZ * Math.cos(tiltRad);

  return {
    x: 50 + baseX * radiusPercent,
    y: 50 - rotatedY * radiusPercent,
    z: rotatedZ,
  };
}

export default function EarthHome() {
  const [rotation, setRotation] = useState<RotationState>({ x: -10, y: -100 });
  const [zoom, setZoom] = useState(1);
  const [introKey, setIntroKey] = useState(0);
  const [introRunning, setIntroRunning] = useState(true);

  const drag = useRef({ active: false, x: 0, y: 0 });
  const rotationRef = useRef<RotationState>({ x: -10, y: -100 });
  const velocityRef = useRef({ x: 0, y: 0.12 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const seen = window.localStorage.getItem("lee-universe-intro-seen");
    if (seen === "1") setIntroRunning(false);
  }, []);

  useEffect(() => {
    if (!introRunning) return;
    const timer = window.setTimeout(() => {
      setIntroRunning(false);
      window.localStorage.setItem("lee-universe-intro-seen", "1");
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [introKey, introRunning]);

  useEffect(() => {
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(40, now - previous) / 16.667;
      previous = now;

      if (!drag.current.active) {
        rotationRef.current = {
          x: clamp(rotationRef.current.x + velocityRef.current.x * delta, -28, 28),
          y: normalizeAngle(rotationRef.current.y + (0.09 + velocityRef.current.y) * delta),
        };

        velocityRef.current = {
          x: velocityRef.current.x * 0.92,
          y: velocityRef.current.y * 0.92,
        };

        if (Math.abs(velocityRef.current.x) < 0.003) velocityRef.current.x = 0;
        if (Math.abs(velocityRef.current.y) < 0.003) velocityRef.current.y = 0;
        setRotation({ ...rotationRef.current });
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const projectedPresence = useMemo(() => {
    return PRESENCE_ORBS.map((orb) => {
      const point = projectSpherePoint(orb.lat, orb.lon, rotation, 34.5);
      const visible = point.z > 0.02;
      const glow = clamp(point.z, 0, 1);
      return {
        ...orb,
        left: point.x,
        top: point.y,
        visible,
        opacity: visible ? 0.34 + glow * 0.66 : 0,
        scale: 0.75 + glow * 0.9,
      };
    });
  }, [rotation]);

  const projectedWorlds = useMemo(() => {
    return WORLD_HINTS.map((world) => {
      const point = projectSpherePoint(world.lat, world.lon, rotation, world.orbitRadius);
      const visible = point.z > -0.08;
      const glow = clamp((point.z + 0.22) / 1.22, 0, 1);
      return {
        ...world,
        left: point.x,
        top: point.y,
        visible,
        opacity: visible ? 0.2 + glow * 0.8 : 0,
        scale: 0.78 + glow * 0.34,
      };
    });
  }, [rotation]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { active: true, x: event.clientX, y: event.clientY };
    velocityRef.current = { x: 0, y: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;

    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;

    const nextRotation = {
      x: clamp(rotationRef.current.x - dy * 0.22, -28, 28),
      y: normalizeAngle(rotationRef.current.y + dx * 0.36),
    };

    rotationRef.current = nextRotation;
    velocityRef.current = {
      x: clamp(-dy * 0.018, -0.42, 0.42),
      y: clamp(dx * 0.016, -0.42, 0.42),
    };
    setRotation(nextRotation);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.06 : 0.06;
    setZoom((current) => clamp(current + delta, 0.82, 1.18));
  }

  function replayIntro() {
    rotationRef.current = { x: -10, y: -100 };
    velocityRef.current = { x: 0, y: 0.14 };
    setRotation(rotationRef.current);
    setZoom(1);
    setIntroKey((current) => current + 1);
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
          aria-label="Drag to rotate Earth and orbit the universe. Use the mouse wheel to zoom."
        >
          <div className={styles.earthViewport} style={{ transform: `scale(${zoom})` }}>
            <div className={styles.orbitRing} aria-hidden="true" />

            {projectedWorlds.map((world) => (
              <button
                key={world.id}
                className={styles.worldHint}
                style={{
                  left: `${world.left}%`,
                  top: `${world.top}%`,
                  opacity: world.opacity,
                  transform: `translate(-50%, -50%) scale(${world.scale})`,
                  pointerEvents: world.visible ? "auto" : "none",
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
            >
              <div className={styles.sunrise} aria-hidden="true" />
              <div
                className={styles.earth}
                style={{
                  backgroundPosition: `${50 + rotation.y * 0.22}% ${48 + rotation.x * 0.16}%`,
                }}
                aria-hidden="true"
              >
                <div className={styles.earthShade} />
                <div className={styles.atmosphere} />
                <div className={styles.presenceLayer}>
                  {projectedPresence.map((orb) => (
                    <span
                      key={orb.id}
                      className={styles.presenceOrb}
                      style={{
                        left: `${orb.left}%`,
                        top: `${orb.top}%`,
                        opacity: orb.opacity,
                        transform: `translate(-50%, -50%) scale(${orb.scale})`,
                        pointerEvents: orb.visible ? "auto" : "none",
                      }}
                    />
                  ))}
                </div>
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
