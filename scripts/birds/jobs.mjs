const STYLE =
  'Ultra-realistic wildlife photograph shot with a 600mm telephoto lens, razor-sharp individual feather detail, natural skin texture on the feet, warm golden-hour sunlight coming from the upper left, soft natural shading. The ENTIRE bird is inside the frame with generous empty margin on every side, nothing cropped. Isolated on a completely flat, uniform, solid pure green (#00FF00) chroma-key background that fills the whole frame edge to edge: no ground, no horizon, no sky, no clouds, no cast shadow on the background, no vignette, no green tint on the bird. No text, no watermark, no border. Photographic realism only: not a painting, not an illustration, not 3D render, not cartoon.';

const BIRDS = {
  hawk: {
    name: 'adult red-tailed hawk (Buteo jamaicensis)',
    plumage:
      'brick-red rufous tail, pale cream chest and throat, a dark brown streaked belly band across the lower breast, dark patagial bars along the leading edge of the pale underwings, dark brown back and upperwings, yellow scaled legs and feet with black hooked talons, yellow cere',
    foot: 'yellow scaled toes and lower leg of a red-tailed hawk with long sharp black hooked talons, feathered brown thigh at the top',
  },
  eagle: {
    name: 'adult bald eagle (Haliaeetus leucocephalus)',
    plumage:
      'pure white head and neck, white fanned tail, dark chocolate-brown body and wings, large bright yellow hooked bill, bright yellow bare legs and massive feet with black hooked talons',
    foot: 'massive bright yellow scaled toes and lower leg of a bald eagle with long sharp black hooked talons, dark brown feathered thigh at the top',
  },
  phoenix: {
    name: 'majestic photorealistic phoenix, a golden-eagle-sized firebird with REAL golden-orange plumage (not flames shaped like a bird)',
    plumage:
      'layered, glossy, finely textured real feathers in warm amber, deep orange and bright golden yellow like a golden pheasant; a regal eagle-like head with a sharp hooked dark beak and an intense eye; a tall flowing swept-back crest of feathery plumes whose tips flicker into soft real flame; long primary wing feathers whose tips and trailing edges dissolve into real fire and glowing embers (fire only at the feather edges, the wing itself stays feathers); a long flowing plume-like tail of streaming golden feathers trailing off into fire and sparks; clearly visible connected legs: golden-orange feathered thighs, scaly orange-gold tarsi and dark sharp curved talons; backlit warm glow with a few floating embers',
    foot: 'scaly orange-gold toes and lower leg of a golden firebird with dark, sharp, curved talons, a golden-orange feathered thigh at the top joining the leg, a few glowing embers drifting off the feathers',
  },
};

function grabBody(b) {
  return `${STYLE} Subject: one ${b.name} in the instant of grabbing prey in mid-air, with no prey present. Camera view: three-quarter front view, the bird's chest and belly toward the camera, NOT a side profile and NOT a flat symmetric head-on spread. The body axis is tilted about 35 degrees from vertical toward the lower right of the frame: the head is at the upper left, the fanned tail is at the lower right. The head is tilted and turned to look straight DOWN at its own feet with intense focus. Both wings are raised high above the back and half spread for balance, like a bird flaring to land. Both legs are fully extended straight down below the body with the feet wide open, toes spread and talons curved, reaching down to grip. The bird's right foot (on the viewer's left) is nearer to the camera, lower and larger; the bird's left foot (on the viewer's right) is higher, further back and partly behind the right foot. Plumage: ${b.plumage}.`;
}

function foot(b, side) {
  const which = side === 'right' ? "the bird's RIGHT foot, seen from the front, with the outer toe on the viewer's left" : "the bird's LEFT foot, seen from the front, with the outer toe on the viewer's right";
  return `${STYLE} Subject: an extreme close-up macro photograph of ONLY one foot and lower leg of a ${b.name}: ${b.foot}. It is ${which}. The leg comes down from the top edge of the frame and the open foot is in the lower center: the toes are spread wide open and curve downward and toward the camera as if closing around an invisible object about as wide as the foot is tall, three toes in front and the hallux behind, talons sharp and hooked. No body, no head, no wings, no other foot in the frame.`;
}

function flight(b, pose) {
  return `${STYLE} Subject: one ${b.name} in flight. ${pose} Plumage: ${b.plumage}.`;
}

const FLIGHT = {
  'fly-up': 'Flying directly toward the camera and slightly below it, caught at the top of the wingbeat: both wings raised high above the back in a steep V, wingtips nearly meeting, primaries spread, the pale underside of the body and the fanned tail visible, legs tucked, head looking at the camera.',
  'fly-level': 'Soaring directly toward the camera, wings fully spread flat and level like a plank, primary feathers splayed like fingers, tail fanned wide, legs tucked up under the tail, the full underside visible, head looking at the camera.',
  'fly-down': 'Flying directly toward the camera, caught at the bottom of a powerful downstroke: both wings swept down and forward below the body in a deep inverted V, the underside of the body visible, tail fanned, legs tucked.',
  'bank': 'Banking hard into a turn, the body rolled about 30 degrees, seen from slightly above and to the side so the top of the back and upperwings are visible: the left wing high, the right wing low, wings fully spread, the fanned tail twisted into the turn, head turned into the turn.',
  'away-3q': 'Three-quarter rear view, flying away from the camera and slightly to the right, seen from behind: the back, the upper surface of both spread wings and the top of the fanned tail are visible, the head is turned slightly so a bit of the cheek shows, wings in a shallow glide.',
  'away-far': 'Seen directly from behind, flying straight away from the camera in a shallow dihedral glide, both wings spread in a gentle V, the back and the fanned tail seen from above, the back of the head visible, slightly soft focus like a distant bird.',
};

function grabBodyV2(b) {
  return `${STYLE} Subject: one ${b.name} photographed from the front at the instant of striking prey in mid-air, with no prey present. Composition rules, in priority order: (1) the bird's head is in the UPPER LEFT quarter of the frame and its fanned tail is in the LOWER RIGHT quarter, so the body axis runs diagonally from upper left to lower right at about 35 degrees from vertical; (2) the head is bowed sharply, beak pointing straight down, eyes locked on its own open feet which hang DIRECTLY BELOW the head; (3) three-quarter front view with the chest and belly facing the camera; (4) both wings raised high above the back, half spread, primaries splayed, as a bird flares to strike; (5) both legs stretched fully down, feet wide open with talons spread, the bird's right foot (viewer's left) nearer the camera and lower, the left foot (viewer's right) a little higher and behind it. Plumage: ${b.plumage}.`;
}

const jobs = [];
for (const [bird, b] of Object.entries(BIRDS)) {
  jobs.push({ id: `${bird}-grab-body`, bird, name: 'grab-body', aspect: '1:1', purpose: 'grab pose: body + wings layer', prompt: grabBody(b) });
  jobs.push({ id: `${bird}-grab-body-v2`, bird, name: 'grab-body-v2', aspect: '1:1', purpose: 'grab pose v2: head bowed over the feet', prompt: grabBodyV2(b) });
  jobs.push({ id: `${bird}-talon-right`, bird, name: 'talon-right', aspect: '3:4', purpose: 'grab pose: right (front) talon layer', prompt: foot(b, 'right') });
  jobs.push({ id: `${bird}-talon-left`, bird, name: 'talon-left', aspect: '3:4', purpose: 'grab pose: left (back) talon layer', prompt: foot(b, 'left') });
  for (const [name, pose] of Object.entries(FLIGHT)) {
    jobs.push({ id: `${bird}-${name}`, bird, name, aspect: '1:1', purpose: `flight frame: ${name}`, prompt: flight(b, pose) });
  }
}

jobs.push({
  id: 'hawk-feather',
  bird: 'hawk',
  name: 'feather',
  aspect: '3:4',
  purpose: 'easter egg: single red-tailed hawk feather',
  prompt: `${STYLE} Subject: ONE single large flight feather of an adult red-tailed hawk, a secondary wing feather about 25 cm long, lying diagonally across the frame with the quill at the lower left and the tip at the upper right. Brown barred vane with darker brown bands and a pale cream edge, a slightly curved pale quill, a few soft downy afterfeather barbs near the base, one small split in the vane. Nothing else in the frame.`,
});

jobs.push({
  id: 'eagle-feather',
  bird: 'eagle',
  name: 'feather',
  aspect: '3:4',
  purpose: 'easter egg: single bald eagle feather',
  prompt: `${STYLE} Subject: ONE single large tail feather of an adult bald eagle, about 30 cm long, lying diagonally across the frame with the quill at the lower left and the tip at the upper right. Pure white vane with a faint pale-grey mottling and a few dark brown flecks near the base, a slightly curved cream quill, soft downy afterfeather barbs at the base, one small split in the vane. Nothing else in the frame.`,
});

jobs.push({
  id: 'phoenix-feather',
  bird: 'phoenix',
  name: 'feather',
  aspect: '3:4',
  purpose: 'phoenix drop: single fire feather',
  prompt: `${STYLE} Subject: ONE single large feather of a phoenix, about 30 cm long, lying diagonally across the frame with the quill at the lower left and the tip at the upper right. The feather is made of REAL photographic fire: the vane is tongues of orange and red flame with a white-hot yellow core along the shaft, the quill is molten glowing orange, glowing embers and a few motion-blurred sparks drift off the tip, like a long-exposure photograph of real fire shaped into a feather. Nothing else in the frame.`,
});

jobs.push({
  id: 'fx-toasted-feather',
  bird: 'fx',
  name: 'toasted-feather',
  aspect: '3:4',
  purpose: 'phoenix talon 2: charred chicken feather particle',
  prompt: `${STYLE} Subject: ONE single small body feather of a yellow chicken that has been toasted by fire, about 8 cm long, lying diagonally across the frame with the quill at the lower left and the tip at the upper right. The outer two thirds of the vane are scorched, curled and charred dark brown and black with a thin glowing orange ember rim along the burnt edge and a few tiny sparks, the base near the quill is still soft golden-yellow down, one thin wisp of grey smoke rising from the tip. Nothing else in the frame.`,
});

jobs.push({
  id: 'fx-fire-puff',
  bird: 'fx',
  name: 'fire-puff',
  aspect: '1:1',
  purpose: 'phoenix talon 2: heat pulse fire sprite (luminance alpha)',
  prompt: `Ultra-realistic high-speed photograph of a short compact burst of real fire, centered in the frame: a roaring flame puff about as wide as it is tall with a bright white-yellow core, orange and red tongues curling outward, a few glowing embers and motion-blurred sparks flying off, realistic flame physics. Isolated on a completely flat pure black (#000000) background that fills the whole frame edge to edge, no smoke, no ground, no objects, no text, no watermark. Photographic realism only, not an illustration, not a 3D render.`,
});

const MYTH_STYLE =
  'Ultra-realistic photograph, razor-sharp detail, natural texture, warm golden-hour sunlight from the upper left, soft natural shading. The ENTIRE subject is inside the frame with generous empty margin on every side, nothing cropped. Isolated on a completely flat, uniform, solid pure white (#FFFFFF) studio background that fills the whole frame edge to edge: no ground, no horizon, no cast shadow on the background, no vignette. No text, no watermark, no border. Photographic realism only: not a painting, not an illustration, not 3D render, not cartoon.';
const MYTH_MODEL = 'google/gemini-2.5-flash-image';
const myth = (name, aspect, purpose, subject) => ({ id: `myth-${name}`, bird: 'myth', name, aspect, model: MYTH_MODEL, purpose, prompt: `${subject} ${MYTH_STYLE}` });
jobs.push(
  myth('lion-leap', '4:3', 'maned male lion pounce frame (replaces the lioness leap)', 'Full-body side view of an adult MALE African lion with a huge thick dark-golden mane, mid-leap in a powerful pounce: body stretched horizontally, front paws reaching forward with claws out, hind legs extended back, mouth open in a roar, facing RIGHT, in profile.'),
  myth('snake-head', '3:2', 'hydra head frame (mirrored for the other side)', 'Close-up side profile of a monstrous dark emerald-green scaled serpent head striking with jaws wide open showing long white fangs and a pink mouth, a thick muscular neck extending straight to the LEFT edge of the frame, head pointing RIGHT, in exact profile.'),
  myth('hydra-body', '4:3', 'hydra body: coiled serpent base without heads', 'A massive coiled dark emerald-green scaled serpent body seen from the side, a large tight coil resting on the ground with three thick neck stumps rising upward from the top of the coil, no heads visible (the necks are cut off at the top edge of the frame), glossy wet scales.'),
  myth('cyclops', '3:4', 'cyclops looming frame (spectacle only)', 'Upper body of a gigantic ancient Greek cyclops, a muscular weathered giant with a single enormous eye in the middle of his forehead, wild dark hair and beard, wearing a rough goat-hide tunic, leaning forward and peering down intently with the single eye, one huge hand raised open-palmed as if about to swat something small, facing LEFT, three-quarter view.'),
  myth('cerberus-stand', '4:3', 'cerberus standing frame (retake 2: three-quarter view so the three heads read)', 'Cerberus, the three-headed guard dog of the Greek underworld: ONE huge black rottweiler-like dog body with THREE heads growing from its shoulders, a center head and one head on each side of it, like the classic Cerberus statue. Seen from a front three-quarter angle, body angled toward the RIGHT, all three heads clearly visible at the same height and snarling with bared teeth, standing tense on all fours, full body in frame.'),
  myth('cerberus-lunge', '4:3', 'cerberus lunging frame (retake 2: three-quarter view so the three heads read)', 'Cerberus, the three-headed guard dog of the Greek underworld: ONE huge black rottweiler-like dog body with THREE heads growing from its shoulders, a center head and one head on each side of it, like the classic Cerberus statue. Seen from a front three-quarter angle, body angled toward the RIGHT, lunging forward with the front paws off the ground, all three heads at the same height snapping with jaws wide open and teeth bared, full body in frame.'),
  myth('cerberus-sleep', '4:3', 'cerberus calmed/asleep frame', 'Full-body side view of Cerberus: a huge black rottweiler-like hellhound with THREE heads on three thick necks side by side, lying down asleep with all three heads resting on its paws, eyes closed, facing RIGHT, in profile.')
);

const tree = (name, purpose, subject) => ({ id: `forest-${name}`, bird: 'forest', name, aspect: '3:4', model: MYTH_MODEL, purpose, prompt: `${subject} ${MYTH_STYLE}` });
const TREE = 'ONE ancient gnarled living oak tree with a FACE formed in its bark: two deep dark eye hollows with glinting eyes, a thick knotted nose, a wide expressive mouth with bark lips; a thick textured mossy trunk, its root system split into two leg-like root clumps so it can walk, two heavy lower branches shaped like arms ending in twiggy fingers, a crown of green leaves at the top; the whole tree from leaf crown to root tips is in the frame; three-quarter view facing RIGHT.';
jobs.push(
  tree('tree-walk', 'living tree walking frame', `${TREE} It is mid-stride, one root-leg lifted forward, arms swinging, expression curious.`),
  tree('tree-grab', 'living tree grabbing frame', `${TREE} It stands with both arm-branches reaching forward and down to the RIGHT, twig fingers curled as if closing around something small, mouth open in a greedy grin.`),
  tree('tree-chipped', 'living tree chipped/releasing frame', `${TREE} Its trunk is badly chipped: large patches of bark broken off exposing pale raw wood and splinters, loose bark chips falling, its arm-branches drooping open wide to the sides, mouth open in a dismayed gasp.`)
);

const JEV_STYLE = 'Photoreal 3D character render, cinematic studio lighting from the upper left, sharp detail, realistic skin pores and brushed steel. Isolated on a completely flat pure chroma green (#00FF00) background that fills the whole frame edge to edge, no shadow on the background, no text, no watermark.';
const JEV_MAN = 'An original fictional man in his early thirties with short spiky light-brown hair, a square jaw and a calm, slightly blank stare, wearing a black collared button shirt over a black t-shirt. The left side of his face is torn back around the eye to reveal a polished steel eye socket with a glowing red robotic eye, small pistons and wires under ragged skin edges; the rest of his face is ordinary human skin.';
jobs.push(
  { id: 'jev-bust', bird: 'jev', name: 'bust', aspect: '1:1', purpose: 'Jev helper: head and shoulders, turned slightly to the left', prompt: `${JEV_STYLE} Subject: head and shoulders of ${JEV_MAN} His body is turned three-quarters toward the left of the frame and he looks to the left. The shoulders run off the bottom of the frame. Both arms are down, out of frame.` },
  { id: 'jev-sleep', bird: 'jev', name: 'sleep', aspect: '1:1', purpose: 'Jev helper: asleep', prompt: `${JEV_STYLE} Subject: head and shoulders of ${JEV_MAN} He has fallen fast asleep sitting up: head tipped sideways onto his shoulder, human eye closed, mouth slightly open, and the robotic eye dim and dark with no glow. The shoulders run off the bottom of the frame.` },
  { id: 'jev-arm-open', bird: 'jev', name: 'arm-open', aspect: '16:9', purpose: 'Jev helper: arm reaching left, hand open', prompt: `${JEV_STYLE} Subject: ONE single human arm in a black shirt sleeve, stretched out perfectly horizontally, the sleeve running off the right edge of the frame and the open hand at the left with fingers spread, reaching for something. The back of the hand has a strip of torn skin showing steel knuckles and wires. Nothing else in the frame.` },
  { id: 'jev-arm-fist', bird: 'jev', name: 'arm-fist', aspect: '16:9', purpose: 'Jev helper: arm reaching left, hand squeezing', prompt: `${JEV_STYLE} Subject: ONE single human arm in a black shirt sleeve, stretched out perfectly horizontally, the sleeve running off the right edge of the frame and the hand at the left squeezed into a tight gripping fist. The back of the hand has a strip of torn skin showing steel knuckles and wires. Nothing else in the frame.` },
);

const JEV_REFS = (process.env.JEV_REFS ?? '').split(',').filter(Boolean);
const JEV_EDIT = 'The first image is the person. Keep him the same recognisable person: same face, hair and black shirt, rendered as a photoreal 3D character. The second image shows the look to add: on his left side, skin torn back around the eye to a polished steel eye socket with machinery and ragged skin edges. Apply it to the person from the first image, keeping the rest of his face human.';
jobs.push(
  { id: 'jev-face', bird: 'jev', name: 'bust', aspect: '1:1', refs: JEV_REFS, purpose: 'Jev helper: bust from the reference photo', prompt: `${JEV_EDIT} Pose: head and shoulders, body three-quarters toward the left of the frame, glowing red robotic eye, calm blank stare, shoulders running off the bottom of the frame, no arms. Replace the background with flat pure chroma green (#00FF00) edge to edge, no shadow, no text.` },
  { id: 'jev-face-sleep', bird: 'jev', name: 'sleep', aspect: '1:1', refs: JEV_REFS, purpose: 'Jev helper: asleep, from the reference photo', prompt: `${JEV_EDIT} Pose: fast asleep sitting up, head tipped sideways onto his shoulder, human eye closed, mouth slightly open, the robotic eye dark with no glow, shoulders running off the bottom of the frame. Replace the background with flat pure chroma green (#00FF00) edge to edge, no shadow, no text.` },
);

const MONKEY_STYLE = 'Ultra-realistic wildlife-style photograph, sharp fur detail, soft natural light from the upper left. Isolated on a completely flat pure chroma green (#00FF00) background that fills the whole frame edge to edge, no shadow on the background, no branch, no text, no watermark.';
jobs.push(
  { id: 'monkey-sit', bird: 'jev', name: 'monkey-sit', aspect: '1:1', purpose: 'Monkey helper: sitting', prompt: `${MONKEY_STYLE} Subject: ONE small brown capuchin monkey sitting upright, whole body in frame, facing three-quarters to the left, holding a short bamboo blowpipe across its lap, curious mischievous eyes, tail curled around its feet.` },
  { id: 'monkey-shoot', bird: 'jev', name: 'monkey-shoot', aspect: '1:1', purpose: 'Monkey helper: shooting darts', prompt: `${MONKEY_STYLE} Subject: ONE small brown capuchin monkey sitting upright, whole body in frame, turned to the left, cheeks puffed, blowing through a short bamboo blowpipe held to its mouth with both hands and aimed up and to the left, focused eyes, tail curled around its feet.` },
  { id: 'jungle-bg', bird: 'jev', name: 'jungle', aspect: '16:9', purpose: 'Jungle era background', prompt: 'Ultra-realistic wide photograph of a dense tropical jungle at dusk, huge mossy tree trunks, hanging vines and broad leaves framing the sides, soft shafts of warm light and mist in the middle distance, a dark leafy forest floor along the bottom of the frame, a thick horizontal branch high on the right side. The centre of the frame stays open and darker so bright objects read clearly over it. No animals, no people, no text, no watermark.' },
);

const MOUND_STYLE = 'Ultra-realistic photograph, sharp natural detail, soft light from the upper left. Isolated on a completely flat pure chroma green (#00FF00) background that fills the whole frame edge to edge, no shadow on the background, no ground, no text, no watermark.';
jobs.push(
  { id: 'mongoose-run', bird: 'jev', name: 'mongoose-run', aspect: '1:1', purpose: 'Mongoose running', prompt: `${MOUND_STYLE} Subject: ONE slender grey-brown mongoose in full side view running to the left, whole body and long tail in frame, alert eyes, mid stride.` },
  { id: 'mongoose-bite', bird: 'jev', name: 'mongoose-bite', aspect: '1:1', purpose: 'Mongoose biting', prompt: `${MOUND_STYLE} Subject: ONE slender grey-brown mongoose lunging to the left with its mouth wide open showing small teeth, front paws reaching forward, whole body and long tail in frame.` },
  { id: 'mound-whole', bird: 'jev', name: 'mound', aspect: '1:1', purpose: 'Termite mound', prompt: `${MOUND_STYLE} Subject: ONE tall conical termite mound of dry grey moon-coloured earth, rough lumpy texture, with a dark round hole in its top. It stands alone, flat at the base.` },
  { id: 'mound-broken', bird: 'jev', name: 'mound-broken', aspect: '1:1', purpose: 'Broken termite mound', prompt: `${MOUND_STYLE} Subject: ONE termite mound of dry grey moon-coloured earth that has been smashed apart: only the jagged lower half remains, with broken chunks and crumbled dirt around its flat base.` },
);

export default jobs;
