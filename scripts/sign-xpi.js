#!/usr/bin/env node

const path = require("path");
const { existsSync, renameSync } = require("fs");
const { argv, exit } = require("process");
const { signAddon } = require("sign-addon");
const { version } = require("../package.json");

const RELEASE_DIR = path.join(__dirname, "../release");

async function main() {
  const args = process.argv.slice(2);
  if (args.length != 3) {
    console.log("USAGE: yarn sign-zip <extension_id> <api_key> <api_secret>");
    exit(1);
  }

  const id = args[0];
  const apiKey = args[1];
  const apiSecret = args[2];

  const zipPath = path.join(RELEASE_DIR, `SzuruChrome-${version}.zip`);
  const xpiPath = path.join(RELEASE_DIR, `SzuruChrome-${version}.xpi`);

  // Ensure the file exists.
  if (!existsSync(zipPath)) {
    console.error(zipPath + " does not exist. Make sure to run 'yarn build' and 'yarn build-zip'.");
    exit(1);
  }

  const result = await signAddon({
    id,
    xpiPath: zipPath,
    version,
    apiKey,
    apiSecret,
    downloadDir: RELEASE_DIR
  });

  if (result.success) {
    console.log(result.downloadedFiles[0]);
    renameSync(result.downloadedFiles[0], xpiPath);
  } else {
    exit(1);
  }
}

main();
