const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const localNodeModules = path.resolve(__dirname, 'node_modules');
const parentNodeModules = path.resolve(__dirname, '../node_modules');

const nodeModulesPaths = [localNodeModules];
if (fs.existsSync(parentNodeModules)) {
  nodeModulesPaths.push(parentNodeModules);
}

const watchFolders = [__dirname];
if (fs.existsSync(parentNodeModules)) {
  watchFolders.push(path.resolve(__dirname, '..'));
}

const config = {
  projectRoot: __dirname,
  watchFolders,
  resolver: {
    nodeModulesPaths,
    assetExts: [...assetExts.filter(ext => ext !== 'svg'), 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
    sourceExts: [...sourceExts, 'cjs', 'mjs'],
  },
};

module.exports = mergeConfig(defaultConfig, config);

