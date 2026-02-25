import type { CSSProperties } from 'react';

type Branch = {
  d: string;
  delayMs: number;
};

type Node = {
  x: number;
  y: number;
  r: number;
  tone: 'hub' | 'green' | 'gray';
};

const center = { x: 180, y: 142 };

const branches: Branch[] = [
  // friends
  { d: 'M180 142 C154 134, 118 112, 86 88', delayMs: 0 },
  { d: 'M180 142 C150 140, 116 122, 86 88', delayMs: 80 },
  { d: 'M180 142 C149 147, 117 132, 86 88', delayMs: 160 },
  { d: 'M180 142 C152 154, 120 145, 86 88', delayMs: 240 },
  // startups
  { d: 'M180 142 C210 128, 246 102, 289 76', delayMs: 320 },
  { d: 'M180 142 C212 134, 248 112, 289 76', delayMs: 400 },
  { d: 'M180 142 C214 141, 251 122, 289 76', delayMs: 480 },
  { d: 'M180 142 C215 148, 252 130, 289 76', delayMs: 560 },
  // san francisco
  { d: 'M180 142 C149 156, 110 180, 74 196', delayMs: 640 },
  { d: 'M180 142 C147 163, 108 187, 74 196', delayMs: 720 },
  { d: 'M180 142 C145 170, 106 193, 74 196', delayMs: 800 },
  { d: 'M180 142 C143 176, 104 199, 74 196', delayMs: 880 },
  // business trips
  { d: 'M180 142 C214 154, 251 182, 294 205', delayMs: 960 },
  { d: 'M180 142 C215 160, 252 188, 294 205', delayMs: 1040 },
  { d: 'M180 142 C216 166, 252 194, 294 205', delayMs: 1120 },
  { d: 'M180 142 C217 172, 253 200, 294 205', delayMs: 1200 },
  // ideas
  { d: 'M180 142 C182 116, 191 84, 196 50', delayMs: 1280 },
  { d: 'M180 142 C176 115, 182 82, 196 50', delayMs: 1360 },
  { d: 'M180 142 C188 116, 199 84, 196 50', delayMs: 1440 },
  // leisure
  { d: 'M180 142 C176 167, 168 203, 160 236', delayMs: 1520 },
  { d: 'M180 142 C182 169, 178 203, 160 236', delayMs: 1600 },
  { d: 'M180 142 C188 168, 188 203, 160 236', delayMs: 1680 },
];

const nodes: Node[] = [
  { x: center.x, y: center.y, r: 13, tone: 'hub' },
  { x: 86, y: 88, r: 5.5, tone: 'green' },
  { x: 289, y: 76, r: 5.5, tone: 'green' },
  { x: 74, y: 196, r: 5.5, tone: 'green' },
  { x: 294, y: 205, r: 5.5, tone: 'green' },
  { x: 196, y: 50, r: 5.5, tone: 'gray' },
  { x: 160, y: 236, r: 5.5, tone: 'gray' },
];

function nodeClass(tone: Node['tone']) {
  switch (tone) {
    case 'hub':
      return 'grow-signal-node-hub';
    case 'gray':
      return 'grow-signal-node-gray';
    default:
      return 'grow-signal-node-green';
  }
}

export function LandingAvailabilitySignal() {
  return (
    <div className="w-full max-w-md" aria-hidden="true">
      <div className="grow-signal-panel relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="grow-signal-grid absolute inset-0" />
        </div>

        <div className="relative flex items-center justify-between border-b border-black/10 pb-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">The Grow Room</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">living network</div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,246,244,0.92))] p-3">
          <div className="grow-signal-dotfield pointer-events-none absolute inset-0 opacity-50" />

          <div className="relative">
            <svg viewBox="0 0 360 280" className="h-auto w-full">
              {branches.map((branch, index) => {
                const style = { animationDelay: `${branch.delayMs}ms` } as CSSProperties;
                return (
                  <path
                    key={`branch-${index}`}
                    d={branch.d}
                    className="grow-signal-branch-line"
                    style={style}
                  />
                );
              })}

              <rect x="186" y="126" width="132" height="32" rx="16" className="grow-signal-room-pill" />

              {nodes.map((node, index) => (
                <circle
                  key={`node-${index}`}
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  className={nodeClass(node.tone)}
                  style={{ animationDelay: `${index * 140}ms` } as CSSProperties}
                />
              ))}

              <g className="grow-signal-labels">
                <text x="252" y="145" textAnchor="middle" className="grow-signal-room-pill-text">
                  the grow room
                </text>

                <text x="94" y="78" className="grow-signal-label">
                  friends
                </text>
                <text x="248" y="67" className="grow-signal-label">
                  startups
                </text>
                <text x="8" y="214" className="grow-signal-label grow-signal-label-long">
                  San Francisco
                </text>
                <text x="223" y="221" className="grow-signal-label grow-signal-label-long">
                  business trips
                </text>
                <text x="206" y="46" className="grow-signal-label">
                  ideas
                </text>
                <text x="168" y="253" className="grow-signal-label">
                  leisure
                </text>
              </g>
            </svg>

            <div className="mt-1 flex items-start justify-between gap-3 border-t border-black/10 pt-2 text-[11px] leading-4 text-black/55">
              <p>Small room. Big network effects.</p>
              <p className="text-right">Invite-only booking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
