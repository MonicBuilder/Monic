'use strict';

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

const
	{compile} = require('./dist/compile');

/** @type {!Array} */
exports.VERSION = [2, 6, 0];

/**
 * Builds the specified file
 *
 * @param {string} file - file path
 * @param {?CompileParams=} [opt_params] - additional parameters:
 *   *) [cwd] - path to the working directory (by default, module.parent)
 *   *) [flags] - map of Monic flags
 *   *) [labels] - map of Monic labels
 *   *) [content] - file text
 *   *) [eol] - EOL symbol
 *   *) [replacers] - array of transform functions
 *   *) [saveFiles=false] - if is true, then generated files will be saved
 *   *) [file] - path to the generated file
 *   *) [sourceMaps=false] - if is `true` or `'inline'`, then will be generated a source map
 *   *) [inputSourceMap] - base source map object for the output source map
 *   *) [sourceMapFile] - path to the generated source map
 *   *) [sourceRoot] - root for all URLs inside the generated source map
 *
 * @param {?function(Error, string=, {map: !Object, decl: string, url: string, isExternal: boolean}=)=} [opt_cb]
 * @returns {!Promise<CompileResult>}
 */
exports.compile = function (file, opt_params, opt_cb) {
	if (opt_cb) {
		/** @type {Promise} */
		const p = compile(file, opt_params);
		return p.then((obj) => opt_cb(null, obj.result, obj.sourceMap), opt_cb);
	}

	return compile(file, opt_params);
};
