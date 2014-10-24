#!/usr/bin/env node

var builder = require('./builder');

if (require.main == module) {
	if (process.argv[2]) {
		compileFile(process.argv[2], process.argv.slice(3));

	} else {
		console.log('Usage: ...');
	}

} else {
	module.exports = require('./builder');
}

function compileFile(fileParam, vars) {
	var fileParams = fileParam.split('::');
	builder.compile(fileParams.shift() || 'index.js', null, fileParams, makeFlags(vars), function (err, result) {

		if (err) {
			throw err;
		}

		console.log(result);
	});
}

function makeFlags(vars) {
	var flags = {};

	for (var i = 0; i < vars.length; i++) {
		flags[vars[i]] = true;
	}

	return flags;
}
