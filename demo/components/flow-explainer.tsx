"use client";

import { useEffect, useState } from "react";

import styles from "./flow-explainer.module.css";

/**
 * Boxed, looping explainer of one CCIP-Read resolution, laid out to match the
 * protocol diagram: wallet -> ENS resolver -> gateway -> (Sui + offchain) ->
 * aggregator -> signed response -> wallet.
 *
 * Motion is CSS keyframes remounted per beat, so it runs off the main thread.
 */

const BEAT_MS = 2200;

interface Node {
  id: string;
  tone: "wallet" | "eth" | "gw" | "sui" | "db" | "agg";
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
}

const NODES: Node[] = [
  { id: "wallet", tone: "wallet", x: 24, y: 128, w: 116, h: 56, label: "App / Wallet" },
  { id: "resolver", tone: "eth", x: 250, y: 128, w: 160, h: 56, label: "ENS Resolver", sub: "CCIP-Read" },
  { id: "gateway", tone: "gw", x: 520, y: 128, w: 130, h: 56, label: "CCIP Gateway" },
  { id: "sui", tone: "sui", x: 720, y: 26, w: 150, h: 50, label: "Sui Records", sub: "address · avatar" },
  { id: "db", tone: "db", x: 720, y: 152, w: 150, h: 50, label: "Offchain Subnames", sub: "EVM addresses" },
  { id: "agg", tone: "agg", x: 906, y: 104, w: 120, h: 58, label: "Record", sub: "Aggregator" },
];

interface Edge {
  id: string;
  d: string;
  /** Beat this edge carries a packet on. */
  beat: number;
  /** Extra ms before the packet starts, for staggered edges. */
  delay?: number;
  num: string;
  nx: number;
  ny: number;
  /** Payload carried on this edge, shown while its beat plays. */
  chip?: { text: string; x: number; y: number };
}

const EDGES: Edge[] = [
  {
    id: "query",
    beat: 0,
    num: "1",
    nx: 193,
    ny: 138,
    d: "M140,146 L246,146",
    chip: { text: "happysingh.onsui.eth", x: 193, y: 96 },
  },
  {
    id: "ccip",
    beat: 1,
    num: "2",
    nx: 463,
    ny: 138,
    d: "M410,146 L516,146",
    chip: { text: "GET /lookup/0x7974…/0x9061….json", x: 463, y: 96 },
  },
  {
    id: "sui",
    beat: 2,
    num: "3a",
    nx: 676,
    ny: 82,
    d: "M650,142 C678,132 690,51 716,51",
    chip: { text: 'suins.resolve("happysingh.sui")', x: 560, y: 106 },
  },
  {
    id: "db",
    beat: 2,
    num: "3b",
    nx: 680,
    ny: 196,
    d: "M650,170 C678,178 690,177 716,177",
    chip: { text: 'namespace.getRecords("happysingh")', x: 700, y: 232 },
  },
  { id: "aggUp", beat: 3, num: "", nx: 0, ny: 0, d: "M870,51 C896,51 906,90 906,118" },
  { id: "aggDown", beat: 3, num: "", nx: 0, ny: 0, d: "M870,177 C896,177 906,160 906,148" },
  {
    id: "unified",
    beat: 3,
    delay: 700,
    num: "4",
    nx: 770,
    ny: 268,
    d: "M966,162 C966,272 760,292 585,186",
    chip: { text: "sui 0x556a…97c3 · eth 0x1a9C…4b2f", x: 700, y: 238 },
  },
  {
    id: "signed",
    beat: 4,
    num: "5",
    nx: 464,
    ny: 184,
    d: "M516,168 L412,168",
    chip: { text: "200 OK · sig 0x1c8f…9d02", x: 464, y: 218 },
  },
  {
    id: "records",
    beat: 5,
    num: "6",
    nx: 194,
    ny: 184,
    d: "M246,168 L142,168",
    chip: { text: "addr(784) 0x556a…97c3", x: 194, y: 218 },
  },
];

/** Monospace chip width, estimated from character count. */
const CHIP_H = 19;
const chipW = (text: string) => text.length * 5.75 + 16;

const BEATS: { active: string[]; caption: string }[] = [
  {
    active: ["wallet", "resolver"],
    caption: "A wallet asks Ethereum for happysingh.onsui.eth.",
  },
  {
    active: ["resolver", "gateway"],
    caption:
      "The resolver stores no answer. It reverts with a gateway URL — that is CCIP-Read.",
  },
  {
    active: ["gateway", "sui", "db"],
    caption:
      "The gateway reads the Sui chain for the address and avatar, and the offchain store for EVM addresses.",
  },
  {
    active: ["sui", "db", "agg", "gateway"],
    caption: "Both sources merge into one profile and return to the gateway.",
  },
  {
    active: ["gateway", "resolver"],
    caption: "The gateway signs the profile so nothing can be swapped in transit.",
  },
  {
    active: ["resolver", "wallet"],
    caption:
      "The resolver verifies that signature on-chain, and the wallet gets its records.",
  },
];

export function FlowExplainer() {
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => clearInterval(id);
  }, [paused]);

  const step = BEATS[beat];
  const isOn = (id: string) => step.active.includes(id);

  return (
    <figure
      className={styles.box}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.scroll}>
        <svg
          aria-label="A wallet queries the ENS resolver, which points to the OnSui gateway. The gateway reads Sui records and offchain subnames, merges them, signs the result, and the resolver returns records to the wallet."
          className={styles.svg}
          role="img"
          viewBox="0 0 1044 330"
        >
          <defs>
            <marker
              id="fx-head"
              markerHeight="6"
              markerWidth="6"
              orient="auto"
              refX="5"
              refY="3"
            >
              <path className={styles.headDim} d="M0,0 L6,3 L0,6 Z" />
            </marker>
            <marker
              id="fx-head-on"
              markerHeight="6"
              markerWidth="6"
              orient="auto"
              refX="5"
              refY="3"
            >
              <path className={styles.headOn} d="M0,0 L6,3 L0,6 Z" />
            </marker>
          </defs>

          <g className={styles.group}>
            <rect height="92" rx="10" width="148" x="8" y="112" />
            <text x="16" y="104">
              User access
            </text>
            <rect height="92" rx="10" width="188" x="236" y="112" />
            <text x="244" y="104">
              Ethereum
            </text>
            <rect height="296" rx="14" width="538" x="496" y="10" />
            <text x="512" y="32">
              OnSui protocol layer
            </text>
          </g>

          {EDGES.map((e) => (
            <path
              className={styles.edge}
              d={e.d}
              data-on={e.beat === beat}
              key={e.id}
              markerEnd={
                e.beat === beat ? "url(#fx-head-on)" : "url(#fx-head)"
              }
            />
          ))}

          {EDGES.filter((e) => e.num).map((e) => (
            <text
              className={styles.edgeNum}
              data-on={e.beat === beat}
              key={`n-${e.id}`}
              x={e.nx}
              y={e.ny}
            >
              {e.num}
            </text>
          ))}

          {EDGES.filter((e) => e.beat === beat && e.chip).map((e) => {
            const chip = e.chip!;
            const w = chipW(chip.text);
            return (
              <g className={styles.chip} key={`${beat}-c-${e.id}`}>
                <rect
                  height={CHIP_H}
                  rx="6"
                  width={w}
                  x={chip.x - w / 2}
                  y={chip.y - CHIP_H / 2}
                />
                <text x={chip.x} y={chip.y + 3.5}>
                  {chip.text}
                </text>
              </g>
            );
          })}

          {EDGES.filter((e) => e.beat === beat).map((e) => (
            <circle
              className={styles.packet}
              key={`${beat}-${e.id}`}
              r="4.5"
              style={{
                offsetPath: `path("${e.d}")`,
                animationDelay: `${e.delay ?? 0}ms`,
              }}
            />
          ))}

          {NODES.map((n) => (
            <g
              className={styles.node}
              data-on={isOn(n.id)}
              data-tone={n.tone}
              key={n.id}
            >
              <rect height={n.h} rx="12" width={n.w} x={n.x} y={n.y} />
              <text
                className={styles.nodeLabel}
                x={n.x + n.w / 2}
                y={n.y + (n.sub ? n.h / 2 - 2 : n.h / 2 + 5)}
              >
                {n.label}
              </text>
              {n.sub ? (
                <text
                  className={styles.nodeSub}
                  x={n.x + n.w / 2}
                  y={n.y + n.h / 2 + 14}
                >
                  {n.sub}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      <figcaption className={styles.footer}>
        <p className={styles.caption} key={beat}>
          <span className={styles.step}>{beat + 1}</span>
          {step.caption}
        </p>
        <div className={styles.dots}>
          {BEATS.map((b, i) => (
            <button
              aria-label={`Step ${i + 1}`}
              className={styles.dot}
              data-on={i === beat}
              key={b.caption}
              onClick={() => setBeat(i)}
              type="button"
            />
          ))}
        </div>
      </figcaption>
    </figure>
  );
}
