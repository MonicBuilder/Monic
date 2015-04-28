var
	sourceMap = require('source-map'),
	SourceMapGenerator = sourceMap.SourceMapGenerator;

var
	Parser = require('./build/parser'),
	path = require('path'),
	fs = require('fs'),
	async = require('async');

var collection = require('collection.js');

global.Collection = collection.Collection;
global.$C = collection.$C;

/** @type {!Array} */
exports.VERSION = [1, 2, 0];

/**
 * Builds a file
 *
 * @param {string} file - the file path
 * @param {Object} params - additional parameters
 * @param {Object=} [params.flags] - a map of flags
 * @param {Object=} [params.labels] - a map of labels
 * @param {?string=} [params.content] - the file text
 * @param {?string=} [params.eol] - EOL symbol
 * @param {Array=} [params.replacers] - an array of transform functions
 * @param {(boolean|string|null)=} [params.sourceMaps] - if is true or 'inline', then will be generated a source map
 * @param {?string=} [params.sourceMapName] - a filename of the source map
 * @param {?string=} [params.sourceFileName] - a filename of the generated file that the source map is associated with
 * @param {?string=} [params.sourceRoot] - a root for all relative URLs in the source map
 * @param {function(Error, string=, string=, SourceMapGenerator=)} callback - a callback function
 */
exports.compile = function (file, params, callback) {
	params = params || {};

	params.flags = params.flags || {};
	params.labels = params.labels || {};

	var
		eol = params.eol || '\n';

	params.replacers = params.replacers || [];
	file = url(file);

	const
		sourceMapName = params.sourceMaps && params.sourceMapName && url(params.sourceMapName),
		sourceFileName = params.sourceFileName ?
			url(params.sourceFileName) : file;

	function finish(err, fileStructure, src) {
		if (err) {
			return callback(err);
		}

		var map = params.sourceMaps ?
			new SourceMapGenerator({
				file: sourceFileName,
				sourceRoot: params.sourceRoot
			}) : null;

		var
			result = fileStructure.compile(params.labels, params.flags, map),
			tasks = [];

		if (sourceMapName && params.sourceMaps !== 'inline') {
			tasks.push(function (cb) {
				fs.writeFile(sourceMapName, map.toString(), cb);
			});
		}

		if (params.sourceFileName) {
			tasks.push(function (cb) {
				if (sourceMapName) {
					var sourceMapUrl;

					if (params.sourceMaps === 'inline') {
						sourceMapUrl = 'data:application\/json;base64,' + new Buffer(map.toString()).toString('base64');

					} else {
						sourceMapUrl = path.join(
							path.relative(path.dirname(sourceFileName), path.dirname(sourceMapName)),
							path.basename(sourceMapName)
						);
					}

					result +=
						(new Array(1 + (result[result.length - 1] !== eol ? 1 : 0)).join(eol)) +
						'//# sourceMappingURL=' + sourceMapUrl;
				}

				fs.writeFile(sourceFileName, result, cb);
			});
		}

		async.parallel(tasks, function () {
			callback(err, result, src, map);
		})
	}

	function url(url) {
		return path.normalize(
			path.resolve(module.parent ?
				path.dirname(module.parent.filename) : '', url)
		);
	}

	var parser = new Parser({
		eol,
		replacers: params.replacers,
		sourceMaps: Boolean(params.sourceMaps)
	});

	Parser.cursor = 1;
	Parser.current = null;

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
