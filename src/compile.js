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
 * Builds a file
 *
 * @param {string} file - file path
 * @param {?CompileParams=} [opt_params] - additional parameters
 * @returns {CompileResult}
 */
export async function compile(file, opt_params) {
	file = url(file);
	const p = {
		flags: {},
		labels: {},
		eol: '\n',
		...opt_params
	};

	const
		sourceMaps = p.sourceMaps,
		sourceRoot = url(p.sourceRoot),
		fileToSave = p.file ? url(p.file) : file;

	const
		sourceMapFile = sourceMaps && (p.sourceMapFile ? url(p.sourceMapFile) : `${fileToSave}.map`),
		externalSourceMap = sourceMaps && sourceMaps !== 'inline';

	function url(url) {
		if (!url) {
			return undefined;
		}

		if (p.cwd) {
			url = path.resolve(p.cwd, url);

		} else {
			url = path.resolve(module.parent ? path.dirname(module.parent.filename) : '', url);
		}

		return Parser.normalizePath(url);
	}

	const parser = new Parser({
		sourceRoot,
		sourceMaps: Boolean(sourceMaps),
		inputSourceMap: p.inputSourceMap,
		eol: p.eol,
		replacers: p.replacers,
		flags: p.flags
	});

	Parser.cursor = 1;
	Parser.current = null;

	const {fileStructure} = await (
		p.content != null ?
			parser.parse(await parser.testFile(file), String(p.content)) :
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
		result = fileStructure.compile(p.labels, p.flags, map),
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

	if (p.saveFiles) {
		if (externalSourceMap) {
			tasks.push((async () => {
				await fs.mkdirsAsync(path.dirname(sourceMapFile));
				await fs.writeFileAsync(sourceMapFile, map.toString());
			})());
		}

		if (p.file) {
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
