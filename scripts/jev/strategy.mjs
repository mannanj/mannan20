export const SKIN_RANK = { phoenix: 3, martian: 3, eagle: 2, hawk: 1.25 };
export const USE_ORDER = ['phoenix', 'martian', 'eagle', 'hawk'];
export const GRIP_SOURCES = ['counter', 'talon', 'chicken_top'];

const ITEM_LABEL = { phoenix: 'Phoenix feather', martian: 'Martian friend', eagle: 'Eagle feather', hawk: 'Hawk feather' };

export const SCENES = {
  landscape: 'a near-black background with faint hand-drawn line art of hills, mountains, trees or buildings',
  ocean: 'a dark blue sea with a bright white wavy water line across the screen and a sun',
  sky: 'a light, medium-blue daytime sky with soft white cloud bars and a dark mountain silhouette along the bottom',
  space: 'outer space with stars and the Earth below',
  moon: 'a grey moon surface under a black starry sky',
  jupiter: 'a rusty orange rocky planet surface with dusty haze and small spacesuited figures standing on it',
};

const noul = (instructions) => ({ type: 'noul', instructions });
const box = (instructions) => ({ type: 'box', instructions });

export const QUESTIONS = {
  chicken: box('the cartoon rainbow rubber chicken in `screen`, with the board, plane or rocket it rides if any; not the score, not the baby chicks. If golden chickens are present, box the golden one'),
  golden: noul('Is there a golden-coloured rubber chicken in `screen`?'),
  golden_box: box('the golden-coloured rubber chicken in `screen`'),
  egg: noul('Is there a shiny golden egg falling or lying in `screen`?'),
  egg_box: box('the shiny golden egg in `screen`'),
  scene: { type: 'choice', instructions: 'Which background scene is `screen` showing?', criteria: SCENES },
  board_open: noul('Is a dark "Leaderboard" panel (with Humans and Agents tabs, a name field, or a list of scores) slid up and covering the lower part of `screen`?'),
  board_toggle: box('the small "Leaderboard" text with a little caret arrow, centered near the very bottom edge of `screen`'),
  gate_ready: noul('Does `screen` show a full-screen message "Scene ready" or "start?" with a start arrow or start button?'),
  gate_start: box('the start arrow or start button of the "Scene ready" message in `screen`'),
  gate_download: noul('Does `screen` show a "Downloading scene" message with a progress bar?'),
  gate_skip: box('the small "skip instead?" link under the downloading progress bar in `screen`'),
  orb: noul('Is there a small round glowing rainbow-coloured orb in `screen` with a text label such as "Multiply x3", "Multiply x5", "Cursor x5", "Cursor x3", "Frenzy x2" or "Chain Lightning"?'),
  orb_box: box('the small round rainbow-coloured ability orb with a label like "Multiply x5", "Cursor x5", "Frenzy x2" or "Chain Lightning" in `screen`'),
  grip: noul('Is the text "help the chicken escape!" shown at the top of `screen`?'),
  counter: box('the yellow text label reading "front claw N / M" or "back claw N / M" in `screen`'),
  claw_side: {
    type: 'choice',
    instructions: 'Does the yellow claw counter label in `screen` read "front claw" or "back claw"?',
    criteria: { front: 'the label starts with the words front claw', back: 'the label starts with the words back claw', none: 'no claw counter label is visible' },
  },
  talon: box("the bird's yellow scaly foot gripping the top of the chicken's head in `screen`"),
  bird_fly: noul('Is a photoreal hawk, eagle or phoenix (not the cartoon chicken) in `screen`, hovering, flying away with its back to us, or a small dark bird shape flying off into the distance, up and to the right?'),
  bird_box: box('the photoreal bird in `screen` (it may be small, dark, brown or far away, with spread wings seen from behind), not the cartoon chicken, not a feather'),
  feather: noul('Is a single brown, orange or golden bird feather falling through the air or lying on the ground in `screen`?'),
  feather_box: box('the single bird feather falling or lying in `screen`'),
  badge: noul('Is there a small cream-coloured round number badge on the brown leather bag icon at the bottom right of `screen`?'),
  bag_open: noul('Is a dark brown inventory list panel open above the bag at the bottom right of `screen`, with item rows and small "Use" buttons?'),
  bag: box('the brown leather bag icon in the bottom right corner of `screen`'),
  martian: noul('Is there an alien figure in a grey spacesuit with a round helmet standing on the rocky orange ground in `screen`?'),
  martian_box: box('the biggest alien figure in a grey spacesuit with a round helmet standing on the rocky ground in `screen`, not the rainbow chicken'),
  ...Object.fromEntries(USE_ORDER.map((id) => [`has_${id}`, noul(`Does the open inventory panel in \`screen\` list a row labelled "${ITEM_LABEL[id]}"?`)])),
  ...Object.fromEntries(USE_ORDER.map((id) => [`use_${id}`, box(`only the small rounded brown button with the word "Use" at the right end of the inventory row labelled "${ITEM_LABEL[id]}" in \`screen\`, not the row`)])),
};

export const THRESHOLDS = {
  board: 0.6,
  gate: 0.6,
  orb: 0.5,
  egg: 0.5,
  golden: 0.5,
  grip: 0.6,
  counterMin: 0.6,
  bird: 0.2,
  feather: 0.4,
  badge: 0.6,
  bag: 0.6,
  martian: 0.4,
  chicken: 0.4,
  boxMin: 0.25,
  birdBoxMin: 0.25,
  useMin: 0.5,
  hasMin: 0.6,
  martianMinHeight: 0.04,
};

export const TIMING = {
  gateSkipAfterMs: 20000,
  bagCooldownMs: [15000, 30000, 60000, 120000],
  clicksMoving: 3,
  clicksSlow: 5,
  clickGapMs: 60,
  slowSpeedPxPerS: 40,
  slowRestMs: 250,
  gripClicks: 8,
  gripGapMs: 30,
  gripFlatBursts: 2,
  frontOffsetPx: 38,
  backOffsetPx: -48,
  aboveHeadPx: 8,
  jupiterStickyMs: 30000,
  martianScore: 16900,
  eggScore: 500,
  eggClicks: 3,
  eggHatchGateMs: 14000,
  badgeWindowMs: 90000,
  martianGoal: 100,
  martianClicks: 6,
  martianGapMs: 40,
  useButtonMaxW: 60,
  useButtonInsetPx: 20,
  counterAgreePx: 70,
  orbClicks: 2,
  birdClicks: 8,
  birdRecedeClicks: 12,
  birdRecedeRestFraction: 0.35,
  birdFocal: { hawk: { x: 0, y: 0 }, eagle: { x: 0.12, y: -0.1 }, phoenix: { x: -0.1, y: -0.12 } },
  birdBoxMaxAgeMs: 3000,
  birdGapMs: 30,
  pickupClicks: 2,
  birdWindowMs: [0, 34000],
  featherWindowMs: 35000,
  orbScore: [250],
  orbHoldMs: 30000,
  boardEveryMs: 3000,
  sceneEveryMs: 10000,
  badgeEveryMs: 5000,
  gripScores: [1950, 9950, 24950],
  gripEpisodeMinFrames: 8,
  gripLostMs: 3000,
};

export const STRATEGY = [
  { id: 'gate', priority: 1, note: 'scene ready: click the start arrow; downloading: wait, skip after 20s' },
  { id: 'board', priority: 2, note: 'close the leaderboard when it is open' },
  { id: 'orb', priority: 3, note: 'ability orbs: 2 clicks, collect first' },
  { id: 'egg', priority: 3, note: 'golden eggs: collect, let up to 3 hatch, prefer golden chickens as targets' },
  { id: 'golden', priority: 8, note: 'golden chickens (5x click value) are the preferred target over the normal chicken' },
  { id: 'grip', priority: 4, note: 'bird gripping: tap the talon (counter anchor, then talon box, then chicken top); chicken clicks score 0' },
  { id: 'kitty-hold', priority: 4, note: 'kitty holding the chicken (banner "the kitty has the chicken!"): keep clicking the chicken, it scores normally; click the kitty every few clicks to shorten the hold' },
  { id: 'cat-miss', priority: 8, note: 'tiger on screen: ignore it, click the chicken as usual; it always misses and leaves within 10 s' },
  { id: 'lion-mane', priority: 7, note: 'lion on screen: click the lion\'s mane 15 times only when the Golden mane drop is still pending (no Golden mane in the bag), otherwise ignore it and click the chicken' },
  { id: 'cyclops', priority: 8, note: 'cyclops looming at the edge: ignore it, click the chicken; it has no click target and swats once' },
  { id: 'hydra-head', priority: 4, note: 'hydra: click the head holding the chicken first (banner "a hydra head has the chicken"), then the nearest striking head; 5 clicks knock a head back, 12 knock-backs end the fight' },
  { id: 'cerberus-head', priority: 4, note: 'cerberus holding the chicken: click the left head 8 times, the right head 8 times, then the middle head 8 times; it falls asleep and drops the Gate key' },
  { id: 'key', priority: 5, note: 'Gate key in the bag: open the bag and use it at once; it opens the enchanted forest' },
  { id: 'tree-bark', priority: 4, note: 'a living tree holds the chicken (banner "the tree has the chicken!"): click the bark target under the HP bar; each click scores 3 and chips it; if a sword is stuck in the trunk, pull it first (25 clicks, counter "pull the sword n / 25")' },
  { id: 'sword', priority: 6, note: 'Sword in the bag: use it to equip (pill "sword equipped"); then press and drag across the densest chicken cluster, every chicken crossed splits into three and scores 1; use it again to put it away' },
  { id: 'mystery', priority: 3, note: 'Mystery ??? orb (rainbow orb labelled "???"): grab it at once; it turns into a random buff and a short pill names it ("??? → Frenzy x2")' },
  { id: 'bird', priority: 5, note: 'after release click the receding bird 25 times for the feather' },
  { id: 'feather', priority: 5, note: 'pick up the feather' },
  { id: 'bag', priority: 6, note: 'open the bag, use the best unworn skin item, close it' },
  { id: 'martian', priority: 7, note: 'Jupiter: click the large Martian for the martian-friend item' },
  { id: 'chicken', priority: 8, note: 'otherwise single clicks on the chicken, never press and hold' },
];

export function questionKeys(ctx) {
  const t = TIMING;
  const keys = new Set(['chicken']);
  const since = (at) => ctx.now - at;
  if (ctx.score >= t.eggScore) ['egg', 'egg_box'].forEach((k) => keys.add(k));
  if (ctx.firstEggAt !== null) ['golden', 'golden_box'].forEach((k) => keys.add(k));
  if (since(ctx.askedAt.scene) > t.sceneEveryMs) keys.add('scene');
  if (since(ctx.askedAt.board) > t.boardEveryMs || ctx.chickenMissing) ['board_open', 'board_toggle'].forEach((k) => keys.add(k));
  if (ctx.gateStage) ['gate_ready', 'gate_start', 'gate_download', 'gate_skip'].forEach((k) => keys.add(k));
  if (ctx.score >= t.orbScore[0]) ['orb', 'orb_box'].forEach((k) => keys.add(k));
  const due = t.gripScores.filter((g) => ctx.score >= g).length;
  if (due > ctx.gripEpisodes || ctx.gripping) ['grip', 'counter', 'claw_side', 'talon'].forEach((k) => keys.add(k));
  const sinceGrip = since(ctx.lastGripAt);
  const flying = ctx.birdPhase === 'depart' || ctx.birdPhase === 'recede';
  if (!ctx.birdFeathered && (flying || (sinceGrip > t.birdWindowMs[0] && sinceGrip < t.birdWindowMs[1]))) ['bird_fly', 'bird_box'].forEach((k) => keys.add(k));
  if (sinceGrip < t.featherWindowMs || since(ctx.pickupAt) < t.featherWindowMs) ['feather', 'feather_box'].forEach((k) => keys.add(k));
  if (ctx.bagOpenExpected) ['bag_open', 'bag', ...USE_ORDER.flatMap((i) => [`has_${i}`, `use_${i}`])].forEach((k) => keys.add(k));
  else if (since(ctx.askedAt.badge) > t.badgeEveryMs && ctx.now >= ctx.bagReadyAt && Math.min(since(ctx.pickupAt), since(ctx.lastGripAt)) < t.badgeWindowMs) ['badge', 'bag'].forEach((k) => keys.add(k));
  if ((ctx.score >= t.martianScore || since(ctx.jupiterSeenAt) < t.jupiterStickyMs) && ctx.martianClicks < t.martianGoal) ['martian', 'martian_box'].forEach((k) => keys.add(k));
  if (ctx.gripping) ['bag_open'].forEach((k) => keys.delete(k));
  return [...keys];
}

export const buildQuestions = (keys) => Object.fromEntries(keys.map((k) => [k, QUESTIONS[k]]));

const noulOf = (a, k) => a[k]?.noul ?? 0;
const toBox = (b, conf, view) => ({
  x: ((b.left + b.right) / 2) * view.width,
  y: ((b.top + b.bottom) / 2) * view.height,
  w: (b.right - b.left) * view.width,
  h: (b.bottom - b.top) * view.height,
  left: b.left * view.width,
  top: b.top * view.height,
  right: b.right * view.width,
  conf,
});
const boxOf = (a, k, min, view) => (a[k]?.box && (a[k].confidence ?? 0) >= min ? toBox(a[k].box, a[k].confidence, view) : null);

function gripTarget(a, stage, view) {
  const t = THRESHOLDS;
  const side = a.claw_side?.choice;
  for (let i = 0; i < GRIP_SOURCES.length; i++) {
    const source = GRIP_SOURCES[(stage + i) % GRIP_SOURCES.length];
    if (source === 'counter') {
      const c = boxOf(a, 'counter', THRESHOLDS.counterMin, view);
      const ch = boxOf(a, 'chicken', 0.3, view);
      const x = c ? (side === 'back' ? c.left + TIMING.backOffsetPx : c.right + TIMING.frontOffsetPx) : 0;
      if (c && side !== 'none' && (!ch || Math.abs(x - ch.x) < TIMING.counterAgreePx)) {
        return { x, y: c.y, w: 56, h: 56, left: x - 28, top: c.y - 28, conf: c.conf, source };
      }
    } else if (source === 'talon') {
      const b = boxOf(a, 'talon', t.boxMin, view);
      if (b) return { ...b, source };
    } else {
      const c = boxOf(a, 'chicken', 0.3, view);
      if (c) return { x: c.x, y: c.top + TIMING.aboveHeadPx, w: 56, h: 56, left: c.x - 28, top: c.top + TIMING.aboveHeadPx - 28, conf: c.conf, source };
    }
  }
  return null;
}

export function bagChoice(a, ctx, view) {
  for (const id of USE_ORDER) {
    if (SKIN_RANK[id] <= ctx.wornRank || noulOf(a, `has_${id}`) < THRESHOLDS.hasMin) continue;
    const b = boxOf(a, `use_${id}`, THRESHOLDS.useMin, view);
    if (b) return { id, target: b.w > TIMING.useButtonMaxW ? { ...b, x: b.right - TIMING.useButtonInsetPx } : b };
  }
  return null;
}

function predictBird(ctx, view) {
  const last = ctx.birdLast;
  if (!last || ctx.now - last.at > TIMING.birdBoxMaxAgeMs) return null;
  const f = TIMING.birdFocal[ctx.birdKind] ?? TIMING.birdFocal.eagle;
  const fx = view.width * (0.5 + f.x);
  const fy = view.height * (0.5 + f.y);
  const k = TIMING.birdRecedeRestFraction;
  const x = last.x + (fx - last.x) * k;
  const y = last.y + (fy - last.y) * k;
  return { x, y, w: 40, h: 40, left: x - 20, top: y - 20, conf: 0 };
}

export function decide(a, ctx, view) {
  const t = THRESHOLDS;
  if (noulOf(a, 'gate_ready') >= t.gate) {
    const target = boxOf(a, 'gate_start', t.boxMin, view);
    if (target) return { rule: 'gate-start', kind: 'click', target, clicks: 1 };
  }
  if (noulOf(a, 'gate_download') >= t.gate) {
    const target = ctx.stuckMs > TIMING.gateSkipAfterMs ? boxOf(a, 'gate_skip', t.boxMin, view) : null;
    return target ? { rule: 'gate-wait', kind: 'click', target, clicks: 1 } : { rule: 'gate-wait', kind: 'wait', restMs: 500 };
  }
  if (noulOf(a, 'board_open') >= t.board) {
    const target = boxOf(a, 'board_toggle', 0, view);
    if (target) return { rule: 'board', kind: 'close-board', target };
  }
  if (noulOf(a, 'orb') >= t.orb) {
    const target = boxOf(a, 'orb_box', t.boxMin, view);
    if (target) return { rule: 'orb', kind: 'click', target, clicks: TIMING.orbClicks, orb: true };
  }
  if (noulOf(a, 'egg') >= t.egg) {
    if (ctx.firstEggAt === null) ctx.firstEggAt = ctx.now;
    const target = ctx.now - ctx.firstEggAt > TIMING.eggHatchGateMs ? boxOf(a, 'egg_box', t.boxMin, view) : null;
    if (target) return { rule: 'egg', kind: 'click', target, clicks: TIMING.eggClicks };
  }
  if (noulOf(a, 'grip') >= t.grip) {
    const target = gripTarget(a, ctx.gripStage, view);
    if (target) return { rule: 'grip', kind: 'click', target, clicks: TIMING.gripClicks, gapMs: TIMING.gripGapMs, grip: true };
  }
  const receding = ctx.birdPhase === 'depart' || ctx.birdPhase === 'recede';
  if (!ctx.birdFeathered && (noulOf(a, 'bird_fly') >= t.bird || receding)) {
    const target = boxOf(a, 'bird_box', t.birdBoxMin, view);
    const clicks = receding ? TIMING.birdRecedeClicks : TIMING.birdClicks;
    if (target) {
      ctx.birdLast = { x: target.x, y: target.y, at: ctx.now };
      return { rule: 'bird', kind: 'click', target, clicks, gapMs: TIMING.birdGapMs };
    }
    const predicted = receding ? predictBird(ctx, view) : null;
    if (predicted) return { rule: 'bird-predict', kind: 'click', target: predicted, clicks, gapMs: TIMING.birdGapMs };
  }
  if (noulOf(a, 'feather') >= t.feather) {
    const target = boxOf(a, 'feather_box', t.boxMin, view);
    if (target) return { rule: 'feather', kind: 'click', target, clicks: TIMING.pickupClicks, pickup: true };
  }
  if (noulOf(a, 'bag_open') >= t.bag) {
    const choice = bagChoice(a, ctx, view);
    if (choice) return { rule: 'bag', kind: 'use', item: choice.id, target: choice.target, clicks: 1 };
    const target = boxOf(a, 'bag', t.boxMin, view);
    if (target) return { rule: 'bag', kind: 'close-bag', target, clicks: 1 };
  } else if (!ctx.bagOpenExpected && noulOf(a, 'badge') >= t.badge) {
    const target = boxOf(a, 'bag', t.boxMin, view);
    if (target) return { rule: 'bag-open', kind: 'open-bag', target, clicks: 1 };
  }
  if (noulOf(a, 'martian') >= t.martian) {
    const target = boxOf(a, 'martian_box', t.boxMin, view);
    if (target && target.h / view.height >= t.martianMinHeight) return { rule: 'martian', kind: 'click', target, clicks: TIMING.martianClicks, gapMs: TIMING.martianGapMs, pickup: true };
  }
  const golden = noulOf(a, 'golden') >= t.golden ? boxOf(a, 'golden_box', t.boxMin, view) : null;
  if (golden) return { rule: 'golden', kind: 'chicken', target: golden };
  const chicken = boxOf(a, 'chicken', t.chicken, view);
  if (chicken) return { rule: 'chicken', kind: 'chicken', target: chicken };
  return { rule: 'idle', kind: 'wait', restMs: 150, chickenMissing: true };
}
