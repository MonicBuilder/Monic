/*!
 * Monic v2.6.1
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Mon, 05 Jul 2021 05:30:16 GMT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compile = compile;
exports.CompileResult = exports.CompileParams = void 0;

var _parser = _interopRequireDefault(require("./parser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const sourceMapFile = require('source-map'),
      SourceMapGenerator = sourceMapFile.SourceMapGenerator;

const path = require('path'),
      fs = require('fs-extra');
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


let CompileParams;
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

exports.CompileParams = CompileParams;
let CompileResult;
/**
 * Builds the specified file
 *
 * @param {string} file - file path
 * @param {?CompileParams=} [opt_params] - additional parameters
 * @returns {CompileResult}
 */

exports.CompileResult = CompileResult;

async function compile(file, opt_params) {
  file = resolvePath(file);
  opt_params = {
    flags: {},
    labels: {},
    eol: '\n',
    ...opt_params
  };
  const sourceMaps = opt_params.sourceMaps,
        sourceRoot = resolvePath(opt_params.sourceRoot),
        fileToSave = opt_params.file ? resolvePath(opt_params.file) : file;
  const sourceMapFile = sourceMaps && (opt_params.sourceMapFile ? resolvePath(opt_params.sourceMapFile) : `${fileToSave}.map`),
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

    return _parser.default.normalizePath(url);
  }

  const parser = new _parser.default({
    sourceRoot,
    sourceMaps: Boolean(sourceMaps),
    inputSourceMap: opt_params.inputSourceMap,
    eol: opt_params.eol,
    replacers: opt_params.replacers,
    flags: opt_params.flags
  });
  _parser.default.cursor = 1;
  _parser.default.current = null;
  const {
    fileStructure
  } = await (opt_params.content != null ? parser.parse(await parser.testFile(file), String(opt_params.content)) : parser.parseFile(file));
  const map = sourceMaps ? new SourceMapGenerator({
    sourceRoot,
    file: _parser.default.getRelativePath(path.dirname(sourceMapFile), fileToSave)
  }) : undefined;
  const tasks = [];
  let result = fileStructure.compile(opt_params.labels, opt_params.flags, map),
      sourceMapDecl,
      sourceMapUrl;

  if (sourceMaps) {
    sourceMapDecl = '//# sourceMappingURL=';

    if (externalSourceMap) {
      sourceMapUrl = _parser.default.getRelativePath(path.dirname(fileToSave), sourceMapFile);
    } else {
      sourceMapUrl = `data:application/json;base64,${Buffer.from(map.toString()).toString('base64')}`;
      result += sourceMapDecl + sourceMapUrl;
    }
  }

  if (opt_params.saveFiles) {
    if (externalSourceMap) {
      tasks.push((async () => {
        await fs.mkdirs(path.dirname(sourceMapFile));
        await fs.writeFile(sourceMapFile, map.toString());
      })());
    }

    if (opt_params.file) {
      tasks.push((async () => {
        if (externalSourceMap) {
          result += sourceMapDecl + sourceMapUrl;
        }

        await fs.mkdirs(path.dirname(fileToSave));
        await fs.writeFile(fileToSave, result);
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
