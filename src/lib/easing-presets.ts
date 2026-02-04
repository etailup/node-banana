export const DEFAULT_CUSTOM_BEZIER: [number, number, number, number] = [0.42, 0, 0.58, 1];

export const PRESET_BEZIERS = {
  easeInExpoOutCubic: [0.85, 0, 0.15, 1],
  easeInOutExpo: [1, 0, 0, 1],
  easeInQuartOutQuad: [0.8, 0, 0.2, 1],
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  easeInOutSine: [0.445, 0.05, 0.55, 0.95],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type EasingPresetName = keyof typeof PRESET_BEZIERS;

export const EASING_PRESETS: EasingPresetName[] = [
  'easeInExpoOutCubic', 'easeInOutExpo', 'easeInQuartOutQuad', 'easeInOutCubic', 'easeInOutSine',
];

export function getPresetBezier(preset?: string | null): [number, number, number, number] {
  const handles = preset ? PRESET_BEZIERS[preset as EasingPresetName] : null;
  const source = handles ?? DEFAULT_CUSTOM_BEZIER;
  return [...source] as [number, number, number, number];
}
