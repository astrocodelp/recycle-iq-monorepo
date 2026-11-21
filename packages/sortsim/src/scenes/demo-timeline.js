// Copied from github.com/Mike17K/recycleiq-delta-sort (src/scenes/demo-timeline.js); see NOTICE.
/** Runs a scene's scripted demo (controls at given times) against a plant. DOM-free: used by the UI and by tests. */
import { DT } from '../core/index.js';

export function createTimeline(demo) {
  let idx = 0;
  return {
    reset() { idx = 0; },
    /** Fire every step that is due at plant.t; returns the steps fired. */
    advance(plant) {
      const fired = [];
      while (idx < demo.steps.length && plant.t >= demo.steps[idx].t) {
        const step = demo.steps[idx++];
        (step.controls ?? []).forEach(e => plant.control(e));
        fired.push(step);
      }
      return fired;
    },
    finished: plant => plant.t >= demo.duration,
  };
}

/** Play the whole demo headlessly. `onStep(plant)` is called after every simulation step. */
export function playDemo(plant, demo, { seconds = demo.duration, onStep } = {}) {
  const timeline = createTimeline(demo);
  for (let i = 0, n = Math.round(seconds / DT); i < n; i++) {
    timeline.advance(plant);
    plant.step();
    if (onStep) onStep(plant);
  }
  return plant;
}
