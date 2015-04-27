var
	sourceMap = require('source-map'),
	SourceMapGenerator = sourceMap.SourceMapGenerator;

var
	Parser = require('./build/parser'),
	path = require('path'),
	fs = require('fs');

var collection = require('collection.js');

global.Collection = collection.Collection;
global.$C = collection.$C;

/** @type {!Array} */
exports.VERSION = [1, 2, 0];

/**
 * Builds a file
 *
 * @param {string} file - the file path
 * @param {{
 *   flags: (Object|undefined),
 *   labels: (Object|undefined),
 *   content: (?string|undefined),
 *   lineSeparator: (?string|undefined),
 *   replacers: (Array|undefined),
 *   sourceMaps: (?boolean|undefined)
 * }} [params] - additional parameters:
 *
 *   *) [params.flags] - a map of flags;
 *   *) [params.labels] - a map of labels;
 *   *) [params.content] - the file text;
 *   *) [params.lineSeparator] - EOL symbol;
 *   *) [params.replacers] - an array of transform functions;
 *   *) [params.sourceMaps] - if is true, then will be enabled support for source maps.
 *
 * @param {function(Error, string=, string=)} callback - a callback function
 */
exports.compile = function (file, params, callback) {
	params = params || {};
	params.flags = params.flags || {};
	params.labels = params.labels || {};
	params.lineSeparator = params.lineSeparator || '\n';
	params.replacers = params.replacers || [];
	params.sourceMaps = Boolean(params.sourceMaps);

	function finish(err, fileStructure, path) {
		if (err) {
			return callback(err);
		}

		var map = params.sourceMaps ? new SourceMapGenerator() : null;
		callback(null, fileStructure.compile(params.labels, params.flags, map), path);
	}

	var parser = new Parser({
		nl: params.lineSeparator,
		replacers: params.replacers,
		sourceMaps: params.sourceMaps
	});

	Parser.cursor = 1;
	Parser.diff = 0;
	Parser.tmpDiff = 0;
	Parser.diffMap = {};
	Parser.current = null;

	file = path.normalize(
		path.resolve(module.parent ?
			path.dirname(module.parent.filename) : '', file)
	);

	if (params.content != null) {
		parser.normalizePath(file, function (err, file) {
			if (err) {
				return callback(err);
			}

			parser.parse(file, String(params.content), finish);
		});

	} else {
		parser.parseFile(file, finish);
	}
};
