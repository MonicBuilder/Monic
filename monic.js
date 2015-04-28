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
exports.VERSION = [2, 0, 0];

/**
 * Builds a file
 *
 * @param {string} file - the file path
 * @param {Object} params - additional parameters
 * @param {Object=} [params.root] - a path to the exec directory (by default, dirname(module.parent.filename))
 * @param {Object=} [params.flags] - a map of flags
 * @param {Object=} [params.labels] - a map of labels
 * @param {?string=} [params.content] - the file text
 * @param {?string=} [params.eol] - EOL symbol
 * @param {Array=} [params.replacers] - an array of transform functions
 * @param {?boolean=} [params.saveFiles=false] - if is true, then generated files will be saved
 * @param {?string=} [params.file] - a path to the generated file
 * @param {(boolean|string|null)=} [params.sourceMaps=false] - if is true or 'inline', then will be generated a source map
 * @param {?string=} [params.sourceMap] - a path to the generated source map
 * @param {?string=} [params.sourceRoot] - the root for all URLs in the generated source map
 * @param {function(Error, string=, string=, SourceMapGenerator=, string=, string=)} callback - a callback function
 */
exports.compile = function (file, params, callback) {
	params = params || {};

	params.flags = params.flags || {};
	params.labels = params.labels || {};

	var
		sourceMaps = params.sourceMaps,
		eol = params.eol || '\n';

	file = url(file);

	var
		sourceRoot = url(params.sourceRoot),
		fileToSave = params.file ?
			url(params.file) : file;

	var
		sourceMapFile = sourceMaps && (params.sourceMap ? url(params.sourceMap) : fileToSave + '.map'),
		externalSourceMap = sourceMaps && sourceMaps !== 'inline';

	function finish(err, fileStructure, src) {
		if (err) {
			return callback(err);
		}

		var map = sourceMaps ?
			new SourceMapGenerator({
				file: Parser.getRelativePath(path.dirname(sourceMapFile), fileToSave),
				sourceRoot: sourceRoot
			}) : null;

		var
			result = fileStructure.compile(params.labels, params.flags, map),
			tasks = [];

		var
			sourceMapDecl,
			sourceMapUrl;

		if (sourceMaps) {
			sourceMapDecl = '//# sourceMappingURL=';

			if (externalSourceMap) {
				sourceMapUrl = Parser.getRelativePath(path.dirname(fileToSave), sourceMapFile);

			} else {
				sourceMapUrl = 'data:application\/json;base64,' + new Buffer(map.toString()).toString('base64');
				result += sourceMapDecl + sourceMapUrl;
			}
		}

		if (params.saveFiles) {
			if (externalSourceMap) {
				tasks.push(function (cb) {
					fs.writeFile(sourceMapFile, map.toString(), cb);
				});
			}

			if (params.file) {
				tasks.push(function (cb) {
					if (externalSourceMap) {
						result += sourceMapDecl + sourceMapUrl;
					}

					fs.writeFile(fileToSave, result, cb);
				});
			}
		}

		async.parallel(tasks, function () {
			callback(err, result, src, map, sourceMapDecl, sourceMapUrl);
		})
	}

	function url(url) {
		if (!url) {
			return undefined;
		}

		if (params.root) {
			url = path.resolve(params.root, url);

		} else {
			url = path.resolve(module.parent ? path.dirname(module.parent.filename) : '', url);
		}

		return Parser.normalizePath(url);
	}

	var parser = new Parser({
		eol: eol,
		replacers: params.replacers,
		sourceMaps: Boolean(sourceMaps),
		sourceRoot: sourceRoot
	});

	Parser.cursor = 1;
	Parser.current = null;

	if (params.content != null) {
		parser.testFile(file, function (err, file) {
			if (err) {
				return callback(err);
			}

			parser.parse(file, String(params.content), finish);
		});

	} else {
		parser.parseFile(file, finish);
	}
};
