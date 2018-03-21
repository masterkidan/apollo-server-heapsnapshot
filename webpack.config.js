const webpack = require('webpack');
const path = require('path');

module.exports = {
	entry: path.resolve(__dirname, 'src/index.ts'),
	target: 'node',
	resolve: {
		mainFields: ['browser', 'main', 'module'],
		extensions: ['.ts', '.tsx', '.js', '.json']
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist')
	},

	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'awesome-typescript-loader',
			}
		]
	},
};
