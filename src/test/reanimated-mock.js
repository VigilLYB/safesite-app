/**
 * Minimal Jest stand-in for react-native-reanimated (v4.7's own mock crashes under jest-expo's
 * native platform resolution: its initializer calls a CSS API the JS fallback doesn't have).
 * Animations resolve instantly; animated components are plain React Native components.
 * Covers only the API this app uses; add to it when the app starts using more.
 */
const { Image, ScrollView, Text, View } = require("react-native");

const identity = (value) => value;

/** Entering/exiting builders: chainable no-ops (FadeIn.duration(200).easing(fn)). */
function builder() {
  const chain = {};
  for (const method of ["duration", "easing", "delay", "springify", "damping", "withCallback"]) {
    chain[method] = () => chain;
  }
  return chain;
}
const layout = new Proxy({}, { get: () => builder() });

const Easing = new Proxy(
  {},
  {
    get:
      () =>
      (...args) =>
        typeof args[0] === "function" ? args[0] : (t) => t,
  },
);

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: identity,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  Easing,
  useSharedValue: (initial) => ({ value: initial, get: () => initial, set() {} }),
  // Used by react-native-gesture-handler's Reanimated integration.
  isSharedValue: (value) =>
    Boolean(value && typeof value === "object" && "value" in value && "set" in value),
  useEvent: (handler) => handler,
  useHandler: () => ({ context: {}, doDependenciesDiffer: false, useWeb: true }),
  useComposedEventHandler: (handlers) => handlers?.[0] ?? (() => undefined),
  setGestureState: () => undefined,
  NativeEventsManager: class {
    attachEvents() {}
    detachEvents() {}
    updateEvents() {}
  },
  useAnimatedStyle: (fn) => fn(),
  useAnimatedProps: (fn) => fn(),
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedReaction: () => undefined,
  withTiming: identity,
  withSpring: identity,
  withDecay: identity,
  withDelay: (_ms, value) => value,
  withSequence: (...values) => values[values.length - 1],
  cancelAnimation: () => undefined,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (value, input, output) => {
    const [i0, i1] = [input[0], input[input.length - 1]];
    const [o0, o1] = [output[0], output[output.length - 1]];
    const t = i1 === i0 ? 0 : Math.min(1, Math.max(0, (value - i0) / (i1 - i0)));
    return o0 + (o1 - o0) * t;
  },
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
  ReduceMotion: { System: "system", Always: "always", Never: "never" },
  FadeIn: layout.FadeIn,
  FadeOut: layout.FadeOut,
  SlideInDown: layout.SlideInDown,
  SlideOutDown: layout.SlideOutDown,
  LinearTransition: layout.LinearTransition,
};
