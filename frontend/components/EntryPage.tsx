'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import BrandMark from './BrandMark';
import { brand } from '@/config/brand';

const SCENES = [
  { id: 'space', label: '星海', src: '/ui/cover-space.jpg' },
  { id: 'ink', label: '水墨', src: '/ui/cover-ink.jpg' },
  { id: 'detective', label: '悬疑', src: '/ui/cover-detective.jpg' },
  { id: 'cat', label: '治愈', src: '/ui/cover-cat.jpg' },
  { id: 'mars', label: '火星', src: '/ui/cover-mars.jpg' },
  { id: 'wuxia', label: '武侠', src: '/ui/cover-wuxia.jpg' },
];

const EFFECTS = ['fill', 'outline', 'tilt', 'glow', 'stretch', 'glitch', 'outline-tilt', 'solid'];

export default function EntryPage() {
  const coverRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [activeScene, setActiveScene] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const letters = useMemo(() => {
    let visibleIndex = 0;
    return Array.from(brand.name).map((char, index) => {
      if (char === ' ') return { char, index, space: true as const, scene: 0, effect: '', order: -1 };
      const scene = visibleIndex % SCENES.length;
      const effect = EFFECTS[visibleIndex % EFFECTS.length];
      const order = visibleIndex;
      visibleIndex += 1;
      return { char, index, space: false as const, scene, effect, order };
    });
  }, []);

  const activate = (index: number, scene: number) => {
    setHovered(index);
    setActiveScene(scene);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (frameRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      coverRef.current?.style.setProperty('--px', x.toFixed(3));
      coverRef.current?.style.setProperty('--py', y.toFixed(3));
    });
  };

  const resetParallax = () => {
    coverRef.current?.style.setProperty('--px', '0');
    coverRef.current?.style.setProperty('--py', '0');
    setHovered(null);
  };

  return (
    <div className="nw-entry">
      <header className="nw-entry-bar">
        <Link href="/" className="nw-entry-brand" aria-label={`${brand.name} 入口`}>
          <BrandMark className="sfa-brand-mark" />
          <span>{brand.name}</span>
        </Link>

        <div className="nw-entry-actions">
          <Link href="/projects" className="nw-entry-link">作品</Link>
          <Link href="/inspiration" className="nw-entry-link">灵感库</Link>
          <Link href="/workbench" className="nw-entry-cta">
            进入工作台
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section
        className="nw-hero"
        aria-labelledby="entry-title"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetParallax}
      >
        <div className="nw-cover" ref={coverRef} aria-hidden="true">
          {SCENES.map((scene, index) => (
            <div
              key={scene.id}
              className={clsx('nw-cover-layer', `motion-${index % 6}`, index === activeScene && 'is-active')}
              style={{ backgroundImage: `url(${scene.src})` }}
            />
          ))}
          <div className="nw-cover-stars" />
          <div className="nw-cover-sheen" />
        </div>
        <div className="nw-hero-shade" aria-hidden="true" />
        <div className="nw-hero-grain" aria-hidden="true" />

        <div className="nw-hero-content">
          <BrandMark className="nw-hero-mark" />
          <p className="nw-hero-eyebrow">AI FILM STUDIO — 影像创作新世界</p>

          <h1 id="entry-title" className="nw-hero-wordmark nw-wordmark" aria-label={brand.name}>
            <span className="nw-wordmark-letters" aria-hidden="true">
              {letters.map(letter => (
                letter.space ? (
                  <span key={letter.index} className="nw-char-space" />
                ) : (
                  <span
                    key={letter.index}
                    className={clsx(
                      'nw-char',
                      `fx-${letter.effect}`,
                      hovered === letter.index && 'is-active',
                    )}
                    style={{ '--char-bg': `url(${SCENES[letter.scene].src})`, '--i': letter.order } as CSSProperties}
                    onPointerEnter={() => activate(letter.index, letter.scene)}
                    onClick={() => activate(letter.index, letter.scene)}
                    onPointerLeave={() => setHovered(current => (current === letter.index ? null : current))}
                  >
                    {letter.char}
                  </span>
                )
              ))}
            </span>
          </h1>

          <p className="nw-hero-lede">
            从一句灵感，到一部成片。剧本、角色、分镜、画面与视频，全部在一个可分阶段掌控的工作流里完成。
          </p>
          <div className="nw-hero-actions">
            <Link href="/workbench" className="nw-btn nw-btn-primary">
              进入工作台
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/workbench#composer" className="nw-btn nw-btn-ghost">
              直接新建创作
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="nw-cover-hint">
            <span className="nw-hint-desktop">悬停字母，切换封面</span>
            <span className="nw-hint-mobile">轻触字母，切换封面</span>
          </p>
        </div>

        <div className="nw-hero-foot">
          <span key={activeScene} className="nw-scene-label">
            SCENE {String(activeScene + 1).padStart(2, '0')} / {SCENES[activeScene].label}
          </span>
          <span className="nw-hero-foot-center">工作台 · 新建创作 · 作品 · 灵感库</span>
          <span>ENTER WORKBENCH</span>
        </div>
      </section>
    </div>
  );
}
