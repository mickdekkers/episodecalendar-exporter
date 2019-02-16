import path from 'path';
import nodeExternals from 'webpack-node-externals';
import CleanWebpackPlugin from 'clean-webpack-plugin';
import DotenvWebpackPlugin from 'dotenv-webpack';
import { Configuration } from 'webpack';

const config: Configuration = {
  mode: 'development',
  devtool: 'source-map',
  target: 'node',
  entry: {
    main: ['source-map-support/register', './main.ts'],
  },
  context: path.resolve(__dirname, 'src'),
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [{ test: /\.ts$/, loader: 'ts-loader' }],
  },
  plugins: [new CleanWebpackPlugin(['dist/*']), new DotenvWebpackPlugin()],
  externals: [nodeExternals()],
};

export default config;
