/*!
 * Monic v2.5.1
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Fri, 18 Jan 2019 16:10:44 GMT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compile = compile;
exports.CompileResult = exports.CompileParams = void 0;

var _parser = _interopRequireDefault(require("./parser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

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
 * Builds a file
 *
 * @param {string} file - file path
 * @param {?CompileParams=} [opt_params] - additional parameters
 * @returns {CompileResult}
 */

exports.CompileResult = CompileResult;

function compile(_x, _x2) {
  return _compile.apply(this, arguments);
}

function _compile() {
  _compile = _asyncToGenerator(function* (file, opt_params) {
    file = url(file);
    opt_params = _objectSpread({
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
    } = yield opt_params.content != null ? parser.parse((yield parser.testFile(file)), String(opt_params.content)) : parser.parseFile(file);
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
      result,
      sourceMap: map && {
        map: JSON.parse(map.toString()),
        decl: sourceMapDecl,
        url: sourceMapUrl,
        isExternal: externalSourceMap
      }
    };
  });
  return _compile.apply(this, arguments);
}
