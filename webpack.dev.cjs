const { merge } = require("webpack-merge");
const ExtensionReloader = require("webpack-ext-reloader");
const common = require("./webpack.common.cjs");

module.exports = merge(common, {
  mode: "development",
  devtool: "source-map",
  plugins: [
    new ExtensionReloader({
      reloadPage: true,
      entries: {
        contentScript: "scripts/content",
        background: "scripts/background",
        extensionPage: ["popup/popup", "options/options"],
      },
    }),
  ],
});
