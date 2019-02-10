const path = require('path');
const slsw = require('serverless-webpack');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

const entries = {};

Object.keys(slsw.lib.entries).forEach(
  (key) => (entries[key] = ['./source-map-install.js', slsw.lib.entries[key]]),
);

module.exports = {
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: entries,
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  target: 'node',
  module: {
    rules: [{test: /\.tsx?$/, loader: 'ts-loader'}],
  },
  // TODO: don't do this in prod, or maybe filter
  plugins: [new Dotenv()],
  externals: ['@serverless-chrome/lambda'],
};
