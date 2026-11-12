/** @type {import('prettier').Config} */
export default {
  plugins: ["prettier-plugin-go-template", "prettier-plugin-organize-attributes", "prettier-plugin-css-order"],
  printWidth: 1000,
  tabWidth: 2,
  overrides: [
    {
      files: ["*.html"],
      options: {
        parser: "go-template",
      },
    },
  ],
  cssDeclarationSorterCustomOrder: ["concentric-css"],
};
