const { merge } = require("webpack-merge");
const ExtensionReloader = require("webpack-ext-reloader");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  plugins: [
    ...common.plugins,
    new ExtensionReloader({
      manifest: __dirname + "/src/manifest.json"
    })
  ]
});
