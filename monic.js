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
 * @param {Object=} [params.root] - a path to the root directory (by default, dirname(module.parent.filename))
 * @param {Object=} [params.flags] - a map of flags
 * @param {Object=} [params.labels] - a map of labels
 * @param {?string=} [params.content] - the file text
 * @param {?string=} [params.eol] - EOL symbol
 * @param {Array=} [params.replacers] - an array of transform functions
 * @param {?string=} [params.fileName] - a filename of the generated file
 * @param {(boolean|string|null)=} [params.sourceMaps] - if is true or 'inline', then will be generated a source map
 * @param {?string=} [params.sourceMapName] - a filename of the generated source map
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

	var
		sourceMapName = params.sourceMaps && params.sourceMapName && url(params.sourceMapName),
		fileName = params.fileName ?
			url(params.fileName) : file;

	function finish(err, fileStructure, src) {
		if (err) {
			return callback(err);
		}

		var map = params.sourceMaps ?
			new SourceMapGenerator({
				file: fileName,
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

		if (params.fileName) {
			tasks.push(function (cb) {
				var sourceMapUrl;

				if (params.sourceMaps === 'inline') {
					sourceMapUrl = 'data:application\/json;base64,' + new Buffer(map.toString()).toString('base64');

				} else if (sourceMapName) {
					sourceMapUrl = path.join(
						path.relative(path.dirname(fileName), path.dirname(sourceMapName)),
						path.basename(sourceMapName)
					);
				}

				if (sourceMapUrl) {
					result +=
						(new Array(1 + (result[result.length - 1] !== eol ? 1 : 0)).join(eol)) +
						'//# sourceMappingURL=' + sourceMapUrl;
				}

				fs.writeFile(fileName, result, cb);
			});
		}

		async.parallel(tasks, function () {
			callback(err, result, src, map);
		})
	}

	function url(url) {
		if (params.root) {
			url = path.resolve(params.root, url);

		} else {
			url = path.resolve(module.parent ? path.dirname(module.parent.filename) : '', url);
		}

		return path.normalize(url);
	}

	var parser = new Parser({
		eol: eol,
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
