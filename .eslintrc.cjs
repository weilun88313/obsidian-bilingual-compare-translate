module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended"],
  ignorePatterns: ["main.js", "node_modules"],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: {
          arguments: true,
          attributes: false,
        },
      },
    ],
    "@typescript-eslint/require-await": "error",
    "no-restricted-properties": [
      "error",
      {
        property: "activeLeaf",
        message: "Workspace.activeLeaf is deprecated. Use getActiveViewOfType or getLeaf instead.",
      },
    ],
  },
};
