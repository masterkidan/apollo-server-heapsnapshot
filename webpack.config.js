const webpack = require('webpack');
const path = require('path');

module.exports = {
	entry: path.resolve(__dirname, 'src/index.ts'),
	target: 'node',
	resolve: {
		mainFields: ['node', 'main', 'module'],
		extensions: ['.ts', '.tsx', '.js', '.json']
	},
	output: {
		filename: 'server.js',
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
	externals: [
		function (context, request, callback) {
			if (request.indexOf("apollo-engine-binary") > -1) {
				return callback(null, "commonjs " + request);
			}
			callback();
		},
	]
};
