/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

var
	sourceMapFile = require('source-map'),
	SourceMapGenerator = sourceMapFile.SourceMapGenerator;

var
	Parser = require('./build/parser'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	mkdirp = require('mkdirp');

/** @type {!Array} */
exports.VERSION = [2, 1, 13];

/**
 * Builds a file
 *
 * @param {string} file - the file path
 * @param {Object} params - additional parameters
 * @param {?string=} [params.cwd] - a path to the working directory (by default, module.parent)
 * @param {Object=} [params.flags] - a map of flags
 * @param {Object=} [params.labels] - a map of labels
 * @param {?string=} [params.content] - the file text
 * @param {?string=} [params.eol] - EOL symbol
 * @param {Array=} [params.replacers] - an array of transform functions
 * @param {?boolean=} [params.saveFiles=false] - if is true, then generated files will be saved
 * @param {?string=} [params.mode='0777'] - a mode for any folders that need to be created for the output folder
 * @param {?string=} [params.file] - a path to the generated file
 * @param {(boolean|string|null)=} [params.sourceMaps=false] - if is true or 'inline', then will be generated a source map
 * @param {Object=} [params.inputSourceMap] - a source map object that the output source map will be based on
 * @param {?string=} [params.sourceMapFile] - a path to the generated source map
 * @param {?string=} [params.sourceRoot] - the root for all URLs in the generated source map
 * @param {function(Error, string=, {map: !Object, decl: string, url: string, isExternal: boolean}=)} callback - a callback function
 */
exports.compile = function (file, params, callback) {
	params = params || {};

	params.flags = params.flags || {};
	params.labels = params.labels || {};
	params.mode = params.mode || '0777';

	var
		sourceMaps = params.sourceMaps,
		eol = params.eol || '\n';

	file = url(file);

	var
		sourceRoot = url(params.sourceRoot),
		fileToSave = params.file ?
			url(params.file) : file;

	var
		sourceMapFile = sourceMaps && (params.sourceMapFile ? url(params.sourceMapFile) : fileToSave + '.map'),
		externalSourceMap = sourceMaps && sourceMaps !== 'inline';

	function finish(err, fileStructure, src) {
		if (err) {
			return callback(err);
		}

		var map = sourceMaps ?
			new SourceMapGenerator({
				file: Parser.getRelativePath(path.dirname(sourceMapFile), fileToSave),
				sourceRoot: sourceRoot
			}) : undefined;

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
					mkdirp(path.dirname(sourceMapFile), {mode: params.mode}, function (err) {
						if (err) {
							return cb(err);
						}

						fs.writeFile(sourceMapFile, map.toString(), cb);
					});
				});
			}

			if (params.file) {
				tasks.push(function (cb) {
					if (externalSourceMap) {
						result += sourceMapDecl + sourceMapUrl;
					}

					mkdirp(path.dirname(fileToSave), {mode: params.mode}, function (err) {
						if (err) {
							return cb(err);
						}

						fs.writeFile(fileToSave, result, cb);
					});
				});
			}
		}

		async.parallel(tasks, function () {
			callback(err, result, map && {
				map: JSON.parse(map.toString()),
				decl: sourceMapDecl,
				url: sourceMapUrl,
				isExternal: externalSourceMap
			});
		})
	}

	function url(url) {
		if (!url) {
			return undefined;
		}

		if (params.cwd) {
			url = path.resolve(params.cwd, url);

		} else {
			url = path.resolve(module.parent ? path.dirname(module.parent.filename) : '', url);
		}

		return Parser.normalizePath(url);
	}

	var parser = new Parser({
		eol: eol,
		replacers: params.replacers,
		sourceMaps: Boolean(sourceMaps),
		sourceRoot: sourceRoot,
		inputSourceMap: params.inputSourceMap
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
