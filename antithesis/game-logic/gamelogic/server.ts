// The SUT: an HTTP server that runs the chicken game's real logic modules, unchanged.
// The driver (antithesis/game-logic/driver) sends it actions; every action calls the game's
// own functions, and the Always assertions below judge each result.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { always, declare, reachable, sometimes } from './sdk';

import {
  FINAL_TIER,
  TIERS,
  clicksAfterDecay,
  moodEyes,
  morphForScore,
  tierForScore,
  tierProgress,
} from '../../../src/components/game/chicken-tiers';
import {
  CHICK_H,
  CHICK_W,
  IMPACT_SQUASH_MAX,
  LEVEL_SCALE,
  MIN_HIT_PX,
  RAG_MAX_DEG,
  TOSS_SPEED_MAX,
  chickSize,
  hitPadFor,
  ragdollStep,
  tossStep,
  tossVelocity,
  type ChickMotion,
  type SplitLevel,
} from '../../../src/components/game/chicken-split';
import {
  BIG_MOMENT_COOLDOWN_MS,
  BIG_MOMENT_MAX_CLONES,
  ORB_GAP_MIN_MS,
  ORB_REGISTRY,
  ORB_REGISTRY_KINDS,
  orbGapMs,
  orbWeight,
  paceTarget,
  pickOrbKind,
  unlockedKinds,
  BEHIND_FORCE,
  type SchedulerContext,
} from '../../../src/components/game/chicken-pacing';
import {
  MAX_CURSORS,
  ORB_KINDS,
  ORB_THRESHOLDS,
  buildCursorOffsets,
  crossedOrbs,
  multiplyFactor,
  pickMysteryEffect,
  type OrbKind,
} from '../../../src/components/game/chicken-orbs';
import { ENDLESS_ERAS, poolForLap } from '../../../src/components/game/endless-eras';
import {
  ICE_BLOCK_MIN_MS,
  ICE_BLOCK_SPREAD_MS,
  ICE_SLOW_FACTOR,
  addFreezeShot,
  createIce,
  icePhase,
  iceSpeedFactor,
  type IceState,
} from '../../../src/components/game/gear';

// ---- Assertion catalog -------------------------------------------------------------------
const A = {
  tierMonotone: 'stage never drops when the score rises',
  progressRange: 'stage progress is within [0, 1] and color morph within [0, 1)',
  moodFloor: "mood is never calmer than the stage's base mood, and ascended exactly at the ascended stages",
  decayOneStage: 'evolution decay drops exactly one stage',
  crossedBetween: 'every orb fired by a click has its threshold between the old and new score',
  crossedComplete: 'every unfired orb whose threshold a click passes fires on that click',
  paceMonotone: 'the pace target never decreases as play time grows',
  tossClamp: 'toss launch speed never exceeds TOSS_SPEED_MAX',
  tossFinite: 'toss physics never produces NaN or Infinity',
  tossBounds: 'a tossed chick stays inside the viewport and above the ground',
  tossImpact: 'toss impacts are non-negative and squash is capped',
  ragdollBounds: 'ragdoll rotation stays within RAG_MAX_DEG and finite',
  hitbox: 'every split level has a hit area at least MIN_HIT_PX wide',
  pickDefined: 'the orb scheduler returns null or an orb kind, never undefined',
  pickInPool: 'a picked orb is unlocked and in the offered pool',
  pickPositive: 'the weighted orb scheduler never picks a kind whose weight is 0',
  pickBigGate: 'big orbs are never picked while ahead, in cooldown, over the clone cap, or right after another big orb',
  gapPositive: 'the orb gap is positive, and at least ORB_GAP_MIN_MS when behind',
  mysteryNotRepeat: 'a mystery orb never repeats the previous effect',
  cursorsCap: 'cursor offsets never exceed MAX_CURSORS',
  iceFactor: 'ice speed factor is 0, ICE_SLOW_FACTOR or 1',
  iceBlockLen: 'an ice block lasts between ICE_BLOCK_MIN_MS and ICE_BLOCK_MIN_MS + ICE_BLOCK_SPREAD_MS',
  // exploration
  reachedFinal: 'a session reaches the final stage (Iridescent One)',
  multiCross: 'one click crosses two or more orb thresholds',
  tinyViewport: 'a toss happens in a viewport smaller than the chick',
  tossRest: 'a tossed chick comes to rest on the ground',
  forcePath: 'the orb scheduler takes the behind-force path',
  bigPicked: 'the orb scheduler picks a big orb',
  nullPick: 'the orb scheduler finds no orb to offer',
  iceSolid: 'a freeze-gun burst freezes the chicken solid',
  iceThaw: 'a frozen chicken thaws back to normal speed',
  serverStarts: 'the game logic server starts',
} as const;

for (const m of [
  A.tierMonotone, A.progressRange, A.moodFloor, A.decayOneStage, A.crossedBetween, A.crossedComplete,
  A.paceMonotone, A.tossClamp, A.tossFinite, A.tossBounds, A.tossImpact, A.ragdollBounds, A.hitbox,
  A.pickDefined, A.pickInPool, A.pickPositive, A.pickBigGate, A.gapPositive, A.mysteryNotRepeat,
  A.cursorsCap, A.iceFactor, A.iceBlockLen,
]) declare(m, 'always');
for (const m of [
  A.reachedFinal, A.multiCross, A.tinyViewport, A.tossRest, A.forcePath, A.bigPicked, A.nullPick,
  A.iceSolid, A.iceThaw,
]) declare(m, 'sometimes');
declare(A.serverStarts, 'reachability');

// ---- Sessions ----------------------------------------------------------------------------
const BOOT = randomUUID();
const MOOD_ORDER = ['calm', 'determined', 'angry', 'furious'];
const HEAT_PER_CLICK = 0.22;
const HEAT_MAX = 1.4;
const HEAT_DECAY_PER_MS = 0.0006;

interface Session {
  score: number;
  heat: number;
  playMs: number;
  now: number;
  fired: Partial<Record<OrbKind, boolean>>;
  firedLog: OrbKind[];
  ice: IceState;
}
const sessions = new Map<string, Session>();

/** Replays the driver's random draws; values cycle so a short list never runs dry. */
function rngFrom(values: unknown): () => number {
  const list = Array.isArray(values) && values.length > 0 ? values.map(Number) : [Math.random()];
  let i = 0;
  return () => list[i++ % list.length];
}

const finite = (...xs: number[]) => xs.every(Number.isFinite);

// ---- Actions -----------------------------------------------------------------------------
type Body = Record<string, any>;

function click(s: Session, b: Body) {
  const prev = s.score;
  const next = prev + Math.max(0, Math.floor(b.n ?? 1)) + Math.max(0, Math.floor(b.bonus ?? 0));
  const crossed = crossedOrbs(prev, next, s.fired);
  for (const k of crossed) {
    s.fired[k] = true;
    s.firedLog.push(k);
  }
  s.score = next;
  s.heat = Math.min(HEAT_MAX, s.heat + HEAT_PER_CLICK * Math.max(1, b.n ?? 1));

  const tPrev = tierForScore(prev);
  const tNext = tierForScore(next);
  always(A.tierMonotone, tNext >= tPrev, { prev, next, tPrev, tNext });

  const progress = tierProgress(next);
  const morph = morphForScore(next);
  always(A.progressRange, progress >= 0 && progress <= 1 && morph >= 0 && morph < 1, { next, progress, morph });

  const mood = moodEyes(next, s.heat);
  const base = TIERS[tNext].eyes;
  // Stages whose base eyes are 'ascended' (Golden God, Iridescent One) always show them; other
  // stages never do, and heat/near-evolution can only push the face up the ladder.
  const ok =
    base === 'ascended'
      ? mood === 'ascended'
      : mood !== 'ascended' && MOOD_ORDER.indexOf(mood) >= MOOD_ORDER.indexOf(base);
  always(A.moodFloor, ok, { score: next, heat: s.heat, mood, base, tier: tNext });

  const decayed = tierForScore(clicksAfterDecay(next));
  always(A.decayOneStage, decayed === Math.max(0, tNext - 1), { score: next, tier: tNext, decayed });

  always(
    A.crossedBetween,
    crossed.every((k) => prev < ORB_THRESHOLDS[k] && ORB_THRESHOLDS[k] <= next),
    { prev, next, crossed },
  );
  const missed = ORB_KINDS.filter((k) => prev < ORB_THRESHOLDS[k] && ORB_THRESHOLDS[k] <= next && !s.fired[k]);
  always(A.crossedComplete, missed.length === 0, { prev, next, missed });

  sometimes(A.reachedFinal, tNext === FINAL_TIER, { score: next });
  sometimes(A.multiCross, crossed.length >= 2, { prev, next, crossed });
  return { score: next, tier: tNext, crossed, mood };
}

function tick(s: Session, b: Body) {
  const dt = Math.max(0, Number(b.dt ?? 16));
  const before = paceTarget(s.playMs);
  s.playMs += dt;
  s.now += dt;
  s.heat = Math.max(0, s.heat - HEAT_DECAY_PER_MS * dt);
  const after = paceTarget(s.playMs);
  always(A.paceMonotone, after >= before, { playMs: s.playMs, before, after });
  return { playMs: s.playMs, paceTarget: after };
}

function toss(b: Body) {
  const level = Math.min(3, Math.max(0, Math.floor(b.level ?? 0))) as SplitLevel;
  const { w, h } = chickSize(level);
  const vw = Number(b.vw ?? 1280);
  const vh = Number(b.vh ?? 800);
  const groundY = Number(b.groundY ?? vh - 40);
  const dt = Number(b.dt ?? 1);
  const steps = Math.min(2000, Math.max(1, Math.floor(b.steps ?? 200)));

  const v = tossVelocity(Number(b.vx ?? 0), Number(b.vy ?? 0));
  const speed = Math.hypot(v.vx, v.vy);
  always(A.tossClamp, speed <= TOSS_SPEED_MAX + 1e-9, { in: [b.vx, b.vy], out: v, speed });

  const m = { x: Number(b.x ?? vw / 2), y: Number(b.y ?? groundY / 2), vx: v.vx, vy: v.vy, rot: 0, rv: 0, squash: 0 } as ChickMotion;
  const fits = vw >= w && groundY >= h;
  sometimes(A.tinyViewport, !fits, { vw, groundY, w, h });

  let maxImpact = 0;
  let nonFinite: Record<string, unknown> | null = null;
  let badImpact: Record<string, unknown> | null = null;
  let outOfBounds: Record<string, unknown> | null = null;
  let rested = false;
  for (let i = 0; i < steps; i++) {
    const impact = tossStep(m, { w, h, vw, vh, groundY }, dt);
    maxImpact = Math.max(maxImpact, impact);
    if (!nonFinite && !finite(m.x, m.y, m.vx, m.vy, m.rot, m.rv, m.squash, impact)) nonFinite = { step: i, m: { ...m }, impact };
    if (!badImpact && (impact < 0 || m.squash > IMPACT_SQUASH_MAX + 1e-9)) badImpact = { step: i, impact, squash: m.squash };
    if (fits && !outOfBounds) {
      const eps = 1e-6;
      const inside =
        m.x >= w / 2 - eps && m.x <= vw - w / 2 + eps && m.y >= h / 2 - eps && m.y <= groundY - h / 2 + eps;
      if (!inside) outOfBounds = { step: i, x: m.x, y: m.y, w, h, vw, groundY };
    }
    if (m.vy === 0 && Math.abs(m.y - (groundY - h / 2)) < 1e-6) rested = true;
  }
  always(A.tossFinite, nonFinite === null, nonFinite ?? {});
  always(A.tossImpact, badImpact === null, badImpact ?? {});
  if (fits) always(A.tossBounds, outOfBounds === null, outOfBounds ?? {});
  sometimes(A.tossRest, rested, { level, vw, groundY });
  return { x: m.x, y: m.y, maxImpact, rested, fits };
}

function ragdoll(b: Body) {
  const m = { rot: Number(b.rot ?? 0), rv: Number(b.rv ?? 0) } as ChickMotion;
  const steps = Math.min(2000, Math.max(1, Math.floor(b.steps ?? 100)));
  let worst = 0;
  for (let i = 0; i < steps; i++) {
    ragdollStep(m, Number(b.ax ?? 0), Number(b.dt ?? 1));
    if (!finite(m.rot, m.rv) || Math.abs(m.rot) > RAG_MAX_DEG + 1e-9) {
      always(A.ragdollBounds, false, { step: i, rot: m.rot, rv: m.rv, input: b });
      return { rot: m.rot, rv: m.rv };
    }
    worst = Math.max(worst, Math.abs(m.rot));
  }
  always(A.ragdollBounds, true);
  return { rot: m.rot, rv: m.rv, worst };
}

function hitbox(b: Body) {
  const level = Math.min(3, Math.max(0, Math.floor(b.level ?? 0)));
  const { w } = chickSize(level);
  const pad = hitPadFor(level);
  const hitW = w + 2 * pad * LEVEL_SCALE[level];
  always(A.hitbox, hitW >= MIN_HIT_PX - 1e-9, { level, w, pad, hitW, CHICK_W, CHICK_H });
  return { level, hitW };
}

function pickOrb(s: Session, b: Body) {
  let pool: OrbKind[] | undefined;
  if (b.pool === 'era') {
    const era = ENDLESS_ERAS[Math.abs(Math.floor(b.eraIndex ?? 0)) % ENDLESS_ERAS.length];
    pool = poolForLap(era, Math.max(1, Math.floor(b.lap ?? 1)));
    if (b.creatureOnScreen) pool = pool.filter((k) => multiplyFactor(k) === null);
  } else if (Array.isArray(b.pool)) {
    pool = b.pool.filter((k: string) => (ORB_REGISTRY_KINDS as string[]).includes(k)) as OrbKind[];
  }
  const ctx: SchedulerContext = {
    score: Number(b.score ?? s.score),
    behind: Number(b.behind ?? 0),
    ahead: Boolean(b.ahead),
    lastKinds: (b.lastKinds ?? []) as OrbKind[],
    jevHeld: Boolean(b.jevHeld),
    aimbotOwned: Boolean(b.aimbotOwned),
    activeKinds: (b.activeKinds ?? []) as OrbKind[],
    clones: Number(b.clones ?? 0),
    goldens: Number(b.goldens ?? 0),
    sinceBigMs: Number(b.sinceBigMs ?? 1e9),
    sinceMultiplyEndMs: Number(b.sinceMultiplyEndMs ?? 1e9),
    rng: rngFrom(b.rng),
    pool,
  };
  const kind = pickOrbKind(ctx);
  const force = ctx.behind >= BEHIND_FORCE;
  sometimes(A.forcePath, force, { behind: ctx.behind });
  const details = { ...ctx, rng: b.rng, kind: kind === undefined ? 'undefined' : kind, force };

  always(A.pickDefined, kind !== undefined, details);
  sometimes(A.nullPick, kind === null, details);
  if (kind) {
    const unlocked = unlockedKinds(ctx.score, ctx.behind);
    always(A.pickInPool, unlocked.includes(kind) && (!pool || pool.includes(kind)), details);
    const weight = orbWeight(kind, ctx);
    if (!force) always(A.pickPositive, weight > 0, { ...details, weight });
    if (ORB_REGISTRY[kind].big) {
      sometimes(A.bigPicked, true, details);
      const last = ctx.lastKinds[0];
      const gated =
        ctx.ahead ||
        ctx.sinceBigMs < BIG_MOMENT_COOLDOWN_MS ||
        ctx.clones > BIG_MOMENT_MAX_CLONES ||
        (last !== undefined && ORB_REGISTRY[last]?.big);
      always(A.pickBigGate, !gated, details);
    }
  }
  const gap = orbGapMs(ctx.behind, ctx.ahead, rngFrom(b.rng));
  always(A.gapPositive, gap > 0 && (ctx.behind <= 0 || gap >= ORB_GAP_MIN_MS), { gap, behind: ctx.behind, ahead: ctx.ahead });
  return { kind: kind === undefined ? '__undefined__' : kind, gap };
}

function mystery(b: Body) {
  const last = (b.last ?? null) as OrbKind | null;
  const kind = pickMysteryEffect(last, rngFrom(b.rng));
  always(A.mysteryNotRepeat, kind !== last, { last, kind, rng: b.rng });
  return { kind };
}

function cursors(b: Body) {
  const offs = buildCursorOffsets(Boolean(b.x5), Boolean(b.x3));
  always(A.cursorsCap, offs.length >= 1 && offs.length <= MAX_CURSORS, { n: offs.length, x5: b.x5, x3: b.x3 });
  return { n: offs.length };
}

/** Freeze-gun shots, composed the way gear-layer.tsx's tick does (resets after a block or a thaw). */
function freeze(s: Session, b: Body) {
  const shots: number[] = Array.isArray(b.shots) ? b.shots.map(Number) : [];
  const rng = rngFrom(b.rng);
  const phases: string[] = [];
  for (const gapMs of shots) {
    s.now += Math.max(0, gapMs);
    const ice = s.ice;
    if (ice.blockUntil > 0 && s.now >= ice.blockUntil) {
      s.ice = createIce();
      sometimes(A.iceThaw, true);
    } else if (ice.iceMs > 0 && ice.blockUntil === 0 && s.now >= ice.slowUntil) {
      ice.iceMs = 0;
    }
    const wasBlocked = s.ice.blockUntil > s.now;
    addFreezeShot(s.ice, s.now, rng);
    if (!wasBlocked && s.ice.blockUntil > s.now) {
      const len = s.ice.blockUntil - s.now;
      always(A.iceBlockLen, len >= ICE_BLOCK_MIN_MS && len <= ICE_BLOCK_MIN_MS + ICE_BLOCK_SPREAD_MS, { len });
    }
    const f = iceSpeedFactor(s.ice, s.now);
    always(A.iceFactor, f === 0 || f === ICE_SLOW_FACTOR || f === 1, { f, ice: s.ice, now: s.now });
    const p = icePhase(s.ice, s.now);
    sometimes(A.iceSolid, p === 'solid', { now: s.now });
    phases.push(p);
  }
  return { phases, ice: s.ice };
}

// ---- HTTP --------------------------------------------------------------------------------
function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, boot: BOOT });
    if (req.method !== 'POST' || req.url !== '/op') return send(res, 404, { error: 'not found' });
    const b = await readBody(req);
    const op = String(b.op);
    if (op === 'new') {
      const sid = randomUUID();
      sessions.set(sid, { score: 0, heat: 0, playMs: 0, now: 0, fired: {}, firedLog: [], ice: createIce() });
      return send(res, 200, { sid, boot: BOOT });
    }
    const stateless: Record<string, (b: Body) => unknown> = { toss, ragdoll, hitbox, mystery, cursors };
    if (op in stateless) return send(res, 200, { boot: BOOT, ...(stateless[op](b) as object) });
    const s = sessions.get(String(b.sid));
    if (!s) return send(res, 410, { error: 'unknown session', boot: BOOT });
    const stateful: Record<string, (s: Session, b: Body) => unknown> = {
      click,
      tick,
      freeze,
      pick_orb: pickOrb,
      state: (x) => ({ score: x.score, fired: x.firedLog, playMs: x.playMs }),
    };
    if (!(op in stateful)) return send(res, 400, { error: `unknown op ${op}` });
    return send(res, 200, { boot: BOOT, ...(stateful[op](s, b) as object) });
  } catch (e) {
    return send(res, 500, { error: String(e) });
  }
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, '0.0.0.0', () => {
  reachable(A.serverStarts, { port, boot: BOOT });
  console.log(`gamelogic listening on :${port} boot=${BOOT}`);
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
