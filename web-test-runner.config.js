export default {
  files: ["tests/**/*.test.js"],
  nodeResolve: true,
  concurrency: 4,
  testFramework: {
    config: {
      ui: "tdd",
      timeout: 10_000,
    },
  },
};
