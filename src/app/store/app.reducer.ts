import { createReducer, on } from '@ngrx/store';
import { AppState, Links } from '../models/models';
import * as AppActions from './app.actions';

const CURSOR_USERNAMES = [
  'happy possum', 'sleepy koala', 'bouncy bunny', 'silly goose', 'fuzzy wombat',
  'giggly penguin', 'peppy panda', 'quirky quokka', 'snuggly sloth', 'cheerful chipmunk',
  'merry meerkat', 'jolly jellyfish', 'playful platypus', 'bubbly beaver', 'wiggly walrus',
  'curious capybara', 'delightful duck', 'excited emu', 'friendly ferret', 'giddy giraffe',
  'humble hamster', 'joyful jaguar', 'kind kangaroo', 'lively lemur', 'mighty mouse',
  'noble narwhal', 'optimistic otter', 'peaceful puffin', 'quirky quail', 'radiant raccoon',
  'sparkly squirrel', 'thoughtful turtle', 'upbeat unicorn', 'vivid vole', 'whimsical whale',
  'xenial xerus', 'youthful yak', 'zippy zebra', 'adorable alpaca', 'bashful badger',
  'clever crow', 'dainty deer', 'eager eagle', 'fancy flamingo', 'gentle gazelle',
  'hopping hedgehog', 'inspired iguana', 'jazzy jackrabbit', 'kooky kiwi', 'laughing llama',
  'magical mantis', 'nimble newt', 'orange octopus', 'perky porcupine', 'quiet quetzal',
  'rambunctious ram', 'sprightly seal', 'tender tadpole', 'uplifting urchin', 'vibrant vulture',
  'wandering weasel', 'xylophone xenops', 'yellow yeti', 'zesty zebu', 'amusing anteater',
  'brilliant butterfly', 'charming cheetah', 'dancing dolphin', 'effervescent elephant', 'fabulous fox',
  'graceful gecko', 'happy hippo', 'incredible ibex', 'jovial jay', 'kindhearted kestrel',
  'loving lion', 'marvelous monkey', 'nice nightingale', 'outgoing owl', 'pleasant peacock',
  'quick quokka', 'relaxed raven', 'sweet swan', 'talented toad', 'understanding urial',
  'valuable viper', 'wonderful wren', 'xcited xeme', 'yawning yapok', 'zealous zebrafish',
  'affable aardvark', 'brave bat', 'cosmic caterpillar', 'dreamy dragonfly', 'energetic ermine',
  'fluffy finch', 'groovy grasshopper', 'hopeful heron', 'innovative insect', 'jubilant jackal',
  'knowing koala', 'luminous ladybug', 'mellow moth', 'neighborly nuthatch', 'outstanding ocelot',
  'precious parrot', 'qualified quoll', 'remarkable robin', 'splendid starfish', 'tranquil tern'
];

export const initialState: AppState = {
  selectedLink: Links.home,
  aboutData: null,
  metadata: null,
  cursorChatPlaceholder: 'say hello to your friend',
  cursorUsernames: CURSOR_USERNAMES
};

export const appReducer = createReducer(
  initialState,
  on(AppActions.setSelectedLink, (state, { link }) => ({
    ...state,
    selectedLink: link
  })),
  on(AppActions.loadAboutDataSuccess, (state, { data }) => ({
    ...state,
    aboutData: data
  })),
  on(AppActions.loadMetadataSuccess, (state, { metadata }) => ({
    ...state,
    metadata
  }))
);
