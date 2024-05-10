/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

const { sharedRoot, sharedTsLoader } = require('./shared.webpack.config');

module.exports = {
  entry: './ts/mains/main_node.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          ...sharedTsLoader,
        },
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
        options: {
          name: '[path][name].[ext]',
        },
      },
    ],
  },

  resolve: {
    symlinks: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  output: {
    filename: 'main.bundled.js',
    path: path.resolve('ts', 'mains', 'main_node.built'),
  },

  target: 'electron-main',

  plugins: [new webpack.DefinePlugin({ CONFIG: JSON.stringify(require('config')) })],
  ...sharedRoot,
};
