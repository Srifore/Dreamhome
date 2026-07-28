import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Explicit cleanup between tests. @testing-library/react's auto-cleanup relies on detecting a
// global `afterEach`, which isn't present since this project's vitest.config.ts runs without
// `test.globals: true` — so we register it ourselves to unmount components between tests.
afterEach(() => {
  cleanup();
});
