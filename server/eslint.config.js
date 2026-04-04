const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["eslint.config.js", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-unreachable": "off",
      "no-undef": "off",
      "no-useless-escape": "off",
      "no-useless-assignment": "off",
      "no-empty": "off",
      "no-useless-catch": "off",
    },
  },
];
