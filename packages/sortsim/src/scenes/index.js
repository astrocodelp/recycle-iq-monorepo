// Copied from github.com/Mike17K/recycleiq-delta-sort (src/scenes/index.js); see NOTICE.
/** Scene registry. To add a scene: create a file here exporting a scene definition and list it below. */
import singleLine from './single-line.js';
import twinLines from './twin-lines.js';

export const SCENES = Object.fromEntries([singleLine, twinLines].map(s => [s.id, s]));
export const DEFAULT_SCENE = singleLine.id;
export const listScenes = () => Object.values(SCENES);
export const getScene = id => {
  const s = SCENES[id];
  if (!s) throw new Error(`unknown scene "${id}" (available: ${Object.keys(SCENES).join(', ')})`);
  return s;
};
