/** Jest entry for `react-native-reanimated` (mapped in the Jest config). The implementation lives in
 * reanimated-mock.js, which `react-native-reanimated/mock` maps to: two files, so a factory that mocks
 * one by requiring the other never requires itself. */
module.exports = require("./reanimated-mock");
