'use strict';

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
	Parser = require('./dist/parser').default,
	path = require('path'),
	fs = require('fs-extra-promise');

/** @type {!Array} */
exports.VERSION = [2, 3, 15];

/**
 * Builds a file
 *
 * @param {string} file - file path
 * @param {Object=} [opt_params] - additional parameters
 * @param {?string=} [opt_params.cwd] - path to the working directory (by default, module.parent)
 * @param {Object=} [opt_params.flags] - map of Monic flags
 * @param {Object=} [opt_params.labels] - map of Monic labels
 * @param {?string=} [opt_params.content] - file text
 * @param {?string=} [opt_params.eol] - EOL symbol
 * @param {Array<function(this:Parser, string, string, function(Error=, string=)=)>=} [opt_params.replacers] - array of transform functions
 * @param {?boolean=} [opt_params.saveFiles=false] - if is true, then generated files will be saved
 * @param {?string=} [opt_params.file] - path to the generated file
 * @param {(boolean|string|null)=} [opt_params.sourceMaps=false] - if is true or 'inline', then will be generated a source map
 * @param {Object=} [opt_params.inputSourceMap] - base source map object for the output source map
 * @param {?string=} [opt_params.sourceMapFile] - path to the generated source map
 * @param {?string=} [opt_params.sourceRoot] - root for all URLs inside the generated source map
 * @param {?function(Error, string=, {map: !Object, decl: string, url: string, isExternal: boolean}=)=} [opt_cb] - callback function
 *   (if not declared, then will be used Promise API)
 */
exports.compile = function (file, opt_params, opt_cb) {
	if (opt_cb) {
		return compile(file, opt_params).then(
			(res) => opt_cb(null, res),
			(err) => opt_cb(err)
		);
	}

	return compile(file, opt_params);
};

async function compile(file, params) {
	file = url(file);
	params = Object.assign({
		flags: {},
		labels: {},
		eol: '\n'
	}, params);

	const
		sourceMaps = params.sourceMaps,
		sourceRoot = url(params.sourceRoot),
		fileToSave = params.file ? url(params.file) : file;

	const
		sourceMapFile = sourceMaps && (params.sourceMapFile ? url(params.sourceMapFile) : `${fileToSave}.map`),
		externalSourceMap = sourceMaps && sourceMaps !== 'inline';

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
		sourceRoot,
		sourceMaps: Boolean(sourceMaps),
		inputSourceMap: params.inputSourceMap,
		eol: params.eol,
		replacers: params.replacers,
		flags: params.flags
	});

	Parser.cursor = 1;
	Parser.current = null;

	const fileStructure = await (
		params.content != null ?
			parser.parse(await parser.testFile(file), String(params.content)) :
			parser.parseFile(file)
	);

	const map = sourceMaps ?
		new SourceMapGenerator({
			sourceRoot,
			file: Parser.getRelativePath(path.dirname(sourceMapFile), fileToSave)
		}) : undefined;

	const
		tasks = [];

	let
		result = fileStructure.compile(params.labels, params.flags, map),
		sourceMapDecl,
		sourceMapUrl;

	if (sourceMaps) {
		sourceMapDecl = '//# sourceMappingURL=';

		if (externalSourceMap) {
			sourceMapUrl = Parser.getRelativePath(path.dirname(fileToSave), sourceMapFile);

		} else {
			sourceMapUrl = `data:application/json;base64,${new Buffer(map.toString()).toString('base64')}`;
			result += sourceMapDecl + sourceMapUrl;
		}
	}

	if (params.saveFiles) {
		if (externalSourceMap) {
			tasks.push((async () => {
				await fs.mkdirsAsync(path.dirname(sourceMapFile));
				await fs.writeFileAsync(sourceMapFile, map.toString());
			})());
		}

		if (params.file) {
			tasks.push((async () => {
				if (externalSourceMap) {
					result += sourceMapDecl + sourceMapUrl;
				}

				await fs.mkdirsAsync(path.dirname(fileToSave));
				await fs.writeFileAsync(fileToSave, result);
			})());
		}
	}

	await Promise.all(tasks);
	return {
		result,
		sourceMap: map && {
			map: JSON.parse(map.toString()),
			decl: sourceMapDecl,
			url: sourceMapUrl,
			isExternal: externalSourceMap
		}
	};
}
