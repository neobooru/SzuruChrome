const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const { version } = require("./package.json");

module.exports = {
  context: __dirname + "/src",
  entry: {
    "scripts/content": { import: "./scripts/content.ts", dependOn: "vendor" },
    "scripts/background": { import: "./scripts/background.ts", dependOn: "vendor" },
    "popup/popup": { import: "./popup/popup.ts", dependOn: "vendor" },
    "options/options": { import: "./options/options.ts", dependOn: "vendor" },
    vendor: ["axios", "neo-scraper", "vue", "webextension-polyfill-ts"]
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  resolve: {
    extensions: [".ts", ".js", ".vue"]
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader"
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          appendTsSuffixTo: [/\.vue$/]
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/,
        type: "asset/resource",
        generator: {
          filename: "[name][ext]"
        }
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]"
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      global: "window"
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css"
    }),
    new CopyPlugin({
      patterns: [
        { from: "icons", to: "icons" },
        { from: "popup/popup.html", to: "popup/popup.html" },
        { from: "options/options.html", to: "options/options.html" },
        {
          from: "manifest.json",
          to: "manifest.json",
          transform: content => {
            const jsonContent = JSON.parse(content);
            jsonContent.version = version;

            // if (config.mode === "development") {
            //   jsonContent["content_security_policy"] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
            // }

            return JSON.stringify(jsonContent, null, 2);
          }
        }
      ]
    })
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false
      })
    ]
  }
};
