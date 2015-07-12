/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

const
	sourceMapFile = require('source-map'),
	SourceMapGenerator = sourceMapFile.SourceMapGenerator;

const
	Parser = require('./dist/parser'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	mkdirp = require('mkdirp'),
	ok = require('okay');

/** @type {!Array} */
exports.VERSION = [2, 1, 19];

/**
 * Builds a file
 *
 * @param {string} file - file path
 * @param {Object} params - additional parameters
 * @param {?string=} [params.cwd] - path to the working directory (by default, module.parent)
 * @param {Object=} [params.flags] - map of Monic flags
 * @param {Object=} [params.labels] - map of Monic labels
 * @param {?string=} [params.content] - file text
 * @param {?string=} [params.eol] - EOL symbol
 * @param {Array=} [params.replacers] - array of transform functions
 * @param {?boolean=} [params.saveFiles=false] - if is true, then generated files will be saved
 * @param {?string=} [params.mode='0777'] - mode for any folders that need to be created for the output folder
 * @param {?string=} [params.file] - path to the generated file
 * @param {(boolean|string|null)=} [params.sourceMaps=false] - if is true or 'inline', then will be generated a source map
 * @param {Object=} [params.inputSourceMap] - base source map object for the output source map
 * @param {?string=} [params.sourceMapFile] - path to the generated source map
 * @param {?string=} [params.sourceRoot] - root for all URLs in the generated source map
 * @param {function(Error, string=, {map: !Object, decl: string, url: string, isExternal: boolean}=)} callback - callback function
 */
exports.compile = function (file, params, callback) {
	params = params || {};

	params.flags = params.flags || {};
	params.labels = params.labels || {};
	params.mode = params.mode || '0777';

	const
		sourceMaps = params.sourceMaps,
		eol = params.eol || '\n';

	file = url(file);

	const
		sourceRoot = url(params.sourceRoot),
		fileToSave = params.file ?
			url(params.file) : file;

	const
		sourceMapFile = sourceMaps && (params.sourceMapFile ? url(params.sourceMapFile) : fileToSave + '.map'),
		externalSourceMap = sourceMaps && sourceMaps !== 'inline';

	const finish = ok(callback, function (fileStructure) {
		const map = sourceMaps ?
			new SourceMapGenerator({
				file: Parser.getRelativePath(path.dirname(sourceMapFile), fileToSave),
				sourceRoot: sourceRoot
			}) : undefined;

		const
			tasks = [];

		var
			result = fileStructure.compile(params.labels, params.flags, map),
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
					mkdirp(path.dirname(sourceMapFile), {mode: params.mode}, ok(cb, function () {
						fs.writeFile(sourceMapFile, map.toString(), cb);
					}));
				});
			}

			if (params.file) {
				tasks.push(function (cb) {
					if (externalSourceMap) {
						result += sourceMapDecl + sourceMapUrl;
					}

					mkdirp(path.dirname(fileToSave), {mode: params.mode}, ok(cb, function () {
						fs.writeFile(fileToSave, result, cb);
					}));
				});
			}
		}

		async.parallel(tasks, function () {
			callback(null, result, map && {
				map: JSON.parse(map.toString()),
				decl: sourceMapDecl,
				url: sourceMapUrl,
				isExternal: externalSourceMap
			});
		});
	});

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

	const parser = new Parser({
		eol: eol,
		replacers: params.replacers,
		sourceMaps: Boolean(sourceMaps),
		sourceRoot: sourceRoot,
		inputSourceMap: params.inputSourceMap
	});

	Parser.cursor = 1;
	Parser.current = null;

	if (params.content != null) {
		parser.testFile(file, ok(callback, function (file) {
			parser.parse(file, String(params.content), finish);
		}));

	} else {
		parser.parseFile(file, finish);
	}
};
