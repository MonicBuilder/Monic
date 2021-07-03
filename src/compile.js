'use strict';

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

import Parser from './parser';

const
	sourceMapFile = require('source-map'),
	SourceMapGenerator = sourceMapFile.SourceMapGenerator;

const
	path = require('path'),
	fs = require('fs-extra-promise');

/**
 * @typedef {{
 *   cwd: (?string|undefined),
 *   content: (?string|undefined),
 *   eol: (?string|undefined),
 *   flags: (Object|undefined),
 *   labels: (Object|undefined),
 *   replacers: (Array<function(this:Parser, string, string, function(Error=, string=)=): ?>|undefined),
 *   saveFiles: (?boolean|undefined),
 *   file: (?string|undefined),
 *   sourceMaps: (boolean|string|null|undefined),
 *   inputSourceMap: (Object|undefined),
 *   sourceMapFile: (?string|undefined),
 *   sourceRoot: (?string|undefined)
 * }}
 */
export let CompileParams;

/**
 * @typedef {{
 *   result: string,
 *   sourceMap: (undefined|{
 *     map: !Object,
 *     decl: string,
 *     url: string,
 *     externalSourceMap: boolean
 *   })
 * }}
 */
export let CompileResult;

/**
 * Builds the specified file
 *
 * @param {string} file - file path
 * @param {?CompileParams=} [opt_params] - additional parameters
 * @returns {CompileResult}
 */
export async function compile(file, opt_params) {
	file = resolvePath(file);
	opt_params = {
		flags: {},
		labels: {},
		eol: '\n',
		...opt_params
	};

	const
		sourceMaps = opt_params.sourceMaps,
		sourceRoot = resolvePath(opt_params.sourceRoot),
		fileToSave = opt_params.file ? resolvePath(opt_params.file) : file;

	const
		sourceMapFile = sourceMaps && (opt_params.sourceMapFile ? resolvePath(opt_params.sourceMapFile) : `${fileToSave}.map`),
		externalSourceMap = sourceMaps && sourceMaps !== 'inline';

	function resolvePath(url) {
		if (!url) {
			return undefined;
		}

		if (opt_params.cwd) {
			url = path.resolve(opt_params.cwd, url);

		} else {
			url = path.resolve(module.parent ? path.dirname(module.parent.filename) : '', url);
		}

		return Parser.normalizePath(url);
	}

	const parser = new Parser({
		sourceRoot,
		sourceMaps: Boolean(sourceMaps),
		inputSourceMap: opt_params.inputSourceMap,
		eol: opt_params.eol,
		replacers: opt_params.replacers,
		flags: opt_params.flags
	});

	Parser.cursor = 1;
	Parser.current = null;

	const {fileStructure} = await (
		opt_params.content != null ?
			parser.parse(await parser.testFile(file), String(opt_params.content)) :
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
		result = fileStructure.compile(opt_params.labels, opt_params.flags, map),
		sourceMapDecl,
		sourceMapUrl;

	if (sourceMaps) {
		sourceMapDecl = '//# sourceMappingURL=';

		if (externalSourceMap) {
			sourceMapUrl = Parser.getRelativePath(path.dirname(fileToSave), sourceMapFile);

		} else {
			sourceMapUrl = `data:application/json;base64,${Buffer.from(map.toString()).toString('base64')}`;
			result += sourceMapDecl + sourceMapUrl;
		}
	}

	if (opt_params.saveFiles) {
		if (externalSourceMap) {
			tasks.push((async () => {
				await fs.mkdirsAsync(path.dirname(sourceMapFile));
				await fs.writeFileAsync(sourceMapFile, map.toString());
			})());
		}

		if (opt_params.file) {
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
