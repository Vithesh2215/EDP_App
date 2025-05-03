// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const defaultConfig = getDefaultConfig(__dirname);
// config.resolver.assetExts.push(
//   // Adds support for `.db` files for SQLite databases
//   'db'
// )
defaultConfig.resolver.sourceExts.push("cjs");
defaultConfig.resolver.unstable_enablePackageExports = false;
module.exports = defaultConfig;
