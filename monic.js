var
	Parser = require('./build/parser'),
	path = require('path');

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
 *   replacers: (Array|undefined)
 * }} [params] - additional parameters:
 *
 *   *) [params.flags] - a map of flags
 *   *) [params.labels] - a map of labels
 *   *) [params.content] - the file text
 *   *) [params.lineSeparator] - EOL symbol
 *   *) [params.replacers] - an array of transform functions
 *
 * @param {function(Error, string=, string=)} callback - a callback function
 */
exports.compile = function (file, params, callback) {
	params = params || {};
	params.flags = params.flags || {};
	params.labels = params.labels || {};
	params.lineSeparator = params.lineSeparator || '\n';
	params.replacers = params.replacers || [];

	function finish(err, fileStructure, path) {
		if (err) {
			return callback(err);
		}

		callback(null, fileStructure.compile(params.labels, params.flags), path);
	}

	var p = {
		lineSeparator: params.lineSeparator,
		replacers: params.replacers
	};

	var parser = new Parser(p);
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
