"use client";

import Link from "next/link";
import ThreeUniverse from "./ThreeUniverse";
import styles from "./EarthHome.module.css";

export default function EarthHome() {
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

        <div className={styles.universeStage}>
          <ThreeUniverse />
        </div>

        <div className={styles.explorePrompt} aria-hidden="true">
          <span className={styles.chevron} />
          <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
        </div>
      </section>
    </main>
  );
}
