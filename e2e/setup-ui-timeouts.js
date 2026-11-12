/**
 * Live UI suite only: real network calls (and Lambda cold starts) take longer than the 1 s default
 * that findBy* / waitFor use. Runs after the test framework is installed, because importing the
 * testing library registers matchers on `expect`.
 */
require("@testing-library/react-native").configure({ asyncUtilTimeout: 20_000 });
