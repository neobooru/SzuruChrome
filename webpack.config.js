const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtensionReloader = require("webpack-extension-reloader");
const AutoDllPlugin = require("autodll-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const { version } = require("./package.json");

const config = {
  mode: process.env.NODE_ENV,
  context: __dirname + "/src",
  entry: {
    "scripts/content": "./scripts/content.ts",
    "scripts/background": "./scripts/background.ts",
    "popup/popup": "./popup/popup.ts",
    "options/options": "./options/options.ts"
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  resolve: {
    extensions: [".ts", ".js", ".vue"]
  },
  performance: {
    hints: false
  },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.vue$/,
        loaders: "vue-loader"
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
        loader: "file-loader",
        options: {
          name: "[name].[ext]?emitFile=false"
        }
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: "file-loader",
        options: {
          name: "[name].[ext]?emitFile=false",
          outputPath: "/fonts/"
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
    new CopyWebpackPlugin([
      { from: "icons", to: "icons", ignore: ["icon.xcf"] },
      { from: "popup/popup.html", to: "popup/popup.html" },
      { from: "options/options.html", to: "options/options.html" },
      {
        from: "manifest.json",
        to: "manifest.json",
        transform: content => {
          const jsonContent = JSON.parse(content);
          jsonContent.version = version;

          if (config.mode === "development") {
            jsonContent["content_security_policy"] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
          }

          return JSON.stringify(jsonContent, null, 2);
        }
      }
    ]),
    new AutoDllPlugin({
      filename: "[name].dll.js",
      entry: {
        vendor: ["vue", "neo-scraper", "webextension-polyfill-ts"]
      }
    })
  ]
};

if (config.mode === "production") {
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: '"production"'
      }
    })
  ]);
}

if (process.env.HMR === "true") {
  config.plugins = (config.plugins || []).concat([
    new ExtensionReloader({
      entries: {
        contentScript: "scripts/content",
        background: "scripts/background"
      }
    })
  ]);
}

module.exports = config;
