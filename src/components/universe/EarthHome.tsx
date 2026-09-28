"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThreeUniverse from "./ThreeUniverse";
import styles from "./EarthHome.module.css";

export default function EarthHome() {
  const [universeResetSignal, setUniverseResetSignal] = useState(0);

  function resetUniverse() {
    setUniverseResetSignal((current) => current + 1);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Home") return;

      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) return;

      event.preventDefault();
      resetUniverse();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="Lee Charles Laing home"
          onClick={(event) => {
            event.preventDefault();
            resetUniverse();
          }}
        >
          LEE CHARLES LAING
        </Link>

        <nav className={styles.nav} aria-label="Primary navigation">
          <a
            href="#home"
            className={styles.activeNav}
            onClick={(event) => {
              event.preventDefault();
              resetUniverse();
            }}
          >
            Home
          </a>
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

        <div className={styles.universeStage}>
          <ThreeUniverse resetSignal={universeResetSignal} />
        </div>

        <div className={styles.explorePrompt} aria-hidden="true">
          <span className={styles.chevron} />
          <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
        </div>
      </section>
    </main>
  );
}
