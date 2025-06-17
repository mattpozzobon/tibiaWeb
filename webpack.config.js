const path = require('path');

module.exports = {
  target: 'node', // Specify Node.js environment
  entry: './engine.ts', // Entry point for your application
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'], // Resolve these extensions
    alias: {
      "@": path.resolve(__dirname, "src"), // Adjust base path if needed
    },
  },
  externals: {
    // Exclude built-in Node.js modules from the bundle
    path: 'commonjs path',
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // Handle TypeScript files
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.json$/, // Enable Webpack's built-in JSON support
        type: 'json',
      },
    ],
  },
  mode: 'development', // Set the build mode
};
