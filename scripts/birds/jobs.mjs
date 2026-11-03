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
    name: 'photorealistic phoenix, a large raptor-shaped firebird the size and build of an eagle',
    plumage:
      'its whole body, wings and long tail are made of REAL photographic fire: the feathers are tongues of orange and red flame with a white-hot yellow core at the chest and head, glowing orange embers and drifting sparks trail from the wingtips and the long streaming tail, realistic flame physics, heat shimmer, motion-blurred sparks, molten glowing feet, like a long-exposure photograph of real fire shaped into a bird',
    foot: 'glowing molten-orange scaled toes and lower leg of a firebird with sharp black-red hooked talons, flame-feathered thigh at the top, real photographic fire and embers licking off the leg',
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

export default jobs;
