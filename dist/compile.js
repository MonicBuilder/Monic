/*!
 * Monic v2.3.17
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Mon, 19 Jun 2017 15:19:31 GMT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.compile = exports.CompileResult = exports.CompileParams = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/**
 * Builds a file
 *
 * @param {string} file - file path
 * @param {?CompileParams=} [opt_params] - additional parameters
 * @returns {CompileResult}
 */
let compile = exports.compile = (() => {
	var _ref = _asyncToGenerator(function* (file, opt_params) {
		file = url(file);
		opt_params = _extends({
			flags: {},
			labels: {},
			eol: '\n'
		}, opt_params);

		const sourceMaps = opt_params.sourceMaps,
		      sourceRoot = url(opt_params.sourceRoot),
		      fileToSave = opt_params.file ? url(opt_params.file) : file;

		const sourceMapFile = sourceMaps && (opt_params.sourceMapFile ? url(opt_params.sourceMapFile) : `${fileToSave}.map`),
		      externalSourceMap = sourceMaps && sourceMaps !== 'inline';

		function url(url) {
			if (!url) {
				return undefined;
			}

			if (opt_params.cwd) {
				url = path.resolve(opt_params.cwd, url);
			} else {
				url = path.resolve(module.parent ? path.dirname(module.parent.filename) : '', url);
			}

			return _parser2.default.normalizePath(url);
		}

		const parser = new _parser2.default({
			sourceRoot: sourceRoot,
			sourceMaps: Boolean(sourceMaps),
			inputSourceMap: opt_params.inputSourceMap,
			eol: opt_params.eol,
			replacers: opt_params.replacers,
			flags: opt_params.flags
		});

		_parser2.default.cursor = 1;
		_parser2.default.current = null;

		var _ref2 = yield opt_params.content != null ? parser.parse((yield parser.testFile(file)), String(opt_params.content)) : parser.parseFile(file);

		const fileStructure = _ref2.fileStructure;


		const map = sourceMaps ? new SourceMapGenerator({
			sourceRoot: sourceRoot,
			file: _parser2.default.getRelativePath(path.dirname(sourceMapFile), fileToSave)
		}) : undefined;

		const tasks = [];

		let result = fileStructure.compile(opt_params.labels, opt_params.flags, map),
		    sourceMapDecl,
		    sourceMapUrl;

		if (sourceMaps) {
			sourceMapDecl = '//# sourceMappingURL=';

			if (externalSourceMap) {
				sourceMapUrl = _parser2.default.getRelativePath(path.dirname(fileToSave), sourceMapFile);
			} else {
				sourceMapUrl = `data:application/json;base64,${new Buffer(map.toString()).toString('base64')}`;
				result += sourceMapDecl + sourceMapUrl;
			}
		}

		if (opt_params.saveFiles) {
			if (externalSourceMap) {
				tasks.push(_asyncToGenerator(function* () {
					yield fs.mkdirsAsync(path.dirname(sourceMapFile));
					yield fs.writeFileAsync(sourceMapFile, map.toString());
				})());
			}

			if (opt_params.file) {
				tasks.push(_asyncToGenerator(function* () {
					if (externalSourceMap) {
						result += sourceMapDecl + sourceMapUrl;
					}

					yield fs.mkdirsAsync(path.dirname(fileToSave));
					yield fs.writeFileAsync(fileToSave, result);
				})());
			}
		}

		yield Promise.all(tasks);
		return {
			result: result,
			sourceMap: map && {
				map: JSON.parse(map.toString()),
				decl: sourceMapDecl,
				url: sourceMapUrl,
				isExternal: externalSourceMap
			}
		};
	});

	return function compile(_x, _x2) {
		return _ref.apply(this, arguments);
	};
})();

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const sourceMapFile = require('source-map'),
      SourceMapGenerator = sourceMapFile.SourceMapGenerator;

const path = require('path'),
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
let CompileParams = exports.CompileParams = undefined;

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
let CompileResult = exports.CompileResult = undefined;
