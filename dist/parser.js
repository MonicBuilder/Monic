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
exports.default = void 0;

var _file = require("./file");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const $C = require('collection.js/compiled');

const path = require('path'),
      fs = require('fs-extra-promise'),
      glob = require('glob-promise');

const {
  SourceMapConsumer
} = require('source-map'),
      {
  hasMagic
} = require('glob');
/**
 * Parser class
 */


class Parser {
  /**
   * Tries to parse the specified expression as JS
   *
   * @param expr
   * @returns {?}
   */
  static parseExpr(expr) {
    const isStr = typeof expr === 'string';

    if (isStr) {
      expr = expr.trim();
    }

    if (expr === '') {
      return undefined;
    }

    if (!isStr) {
      return expr;
    }

    if (!/[^\w ]/.test(expr)) {
      try {
        return JSON.parse(expr);
      } catch (_) {
        return expr;
      }
    }

    try {
      return new Function(`return ${expr}`)();
    } catch (_) {
      return expr;
    }
  }
  /**
   * Normalizes a path
   *
   * @param {string} src
   * @returns {string}
   */


  static normalizePath(src) {
    return path.normalize(src).split(path.sep).join('/');
  }
  /**
   * Solves the relative path from "from" to "to"
   *
   * @param {string} from
   * @param {string} to
   * @returns {string}
   */


  static getRelativePath(from, to) {
    return Parser.normalizePath(path.relative(from, to));
  }
  /**
   * @param {string} eol - EOL symbol
   * @param {Array=} [replacers] - array of transform functions
   * @param {Object=} [flags] - map of global Monic flags
   * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
   * @param {Object=} [inputSourceMap] - base source map object for the output source map
   * @param {?string=} [sourceRoot] - root for all URLs in the generated source map
   */


  constructor({
    eol,
    replacers,
    flags,
    sourceMaps,
    sourceRoot,
    inputSourceMap
  }) {
    this.eol = eol;
    this.replacers = replacers;
    this.flags = _objectSpread({}, flags);
    this.sourceMaps = sourceMaps;
    this.inputSourceMap = inputSourceMap;
    this.sourceRoot = sourceRoot;
    this.realpathCache = {};
    this.cache = {};
  }
  /**
   * Checks a file for existence and returns the absolute path to it
   *
   * @param {string} file - file path
   * @returns {string}
   */


  testFile(file) {
    var _this = this;

    return _asyncToGenerator(function* () {
      file = Parser.normalizePath(path.resolve(file));

      if (_this.realpathCache[file]) {
        return file;
      }

      if (!(yield fs.statAsync(file)).isFile()) {
        throw new Error(`"${file}" is not a file`);
      }

      _this.realpathCache[file] = true;
      return file;
    })();
  }
  /**
   * Parses a path with glob
   *
   * @param {string} base - path to a base file
   * @param {string} src - path
   * @returns {!Array}
   */


  parsePath(base, src) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      const parts = src.split('::'),
            dirname = path.dirname(base);
      parts[0] = parts[0].replace(/\${(.*?)}/g, (str, flag) => {
        if (flag in _this2.flags) {
          const f = _this2.flags[flag];

          if (typeof f === 'function') {
            return f({
              flags: _this2.flags
            });
          }

          return f;
        }

        return '';
      });
      const pattern = path.join(dirname, parts[0]);

      if (hasMagic(pattern)) {
        return $C((yield glob(pattern))).reduce((res, el) => {
          parts[0] = path.relative(dirname, el);
          res.push(parts.slice());
          return res;
        }, []);
      }

      return [parts];
    })();
  }
  /**
   * Parses a file and returns it structure
   *
   * @param {string} file - file path
   * @returns {{fileStructure: (!FileStructure|undefined), file: string}}
   */


  parseFile(file) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      const src = yield _this3.testFile(file),
            content = _this3.cache[src] || (yield fs.readFileAsync(src, 'utf8'));

      if (typeof content !== 'string') {
        return {
          fileStructure: content,
          file: src
        };
      }

      return _this3.parse(src, content);
    })();
  }
  /**
   * Parses a text and returns it structure
   *
   * @param {string} file - file path
   * @param {string} content - source text
   * @returns {{fileStructure: (!FileStructure|undefined), file: string}}
   */


  parse(file, content) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (_this4.cache[file]) {
        return {
          fileStructure: _this4.cache[file],
          file
        };
      }

      yield $C(_this4.replacers).async.forEach(
      /*#__PURE__*/
      function () {
        var _ref = _asyncToGenerator(function* (replacer) {
          if (replacer.length > 2) {
            return new Promise((resolve, reject) => {
              replacer.call(_this4, content, file, (err, res) => {
                if (err) {
                  err.fileName = file;
                  reject(err);
                  return;
                }

                resolve(content = res);
              });
            });
          }

          try {
            content = yield replacer.call(_this4, content, file);
          } catch (err) {
            err.fileName = file;
            throw err;
          }
        });

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }());
      let sourceMap;

      if (_this4.sourceMaps) {
        if (_this4.inputSourceMap) {
          sourceMap = new SourceMapConsumer(_this4.inputSourceMap);
        } else if (/((?:\r?\n|\r)?[^\S\r\n]*\/\/[#@] sourceMappingURL=([^\r\n]*)\s*)$/.test(content)) {
          const [sstr, url] = [RegExp.$1, RegExp.$2];

          const parse =
          /*#__PURE__*/
          function () {
            var _ref2 = _asyncToGenerator(function* (str) {
              try {
                sourceMap = new SourceMapConsumer(JSON.parse((yield str)));
                content = content.replace(sstr, '');
              } catch (_) {}
            });

            return function parse(_x2) {
              return _ref2.apply(this, arguments);
            };
          }();

          if (/data:application\/json;base64,(.*)/.exec(url)) {
            yield parse(Buffer.from(RegExp.$1, 'base64').toString());
          } else {
            yield parse(fs.readFileAsync(path.normalize(path.resolve(path.dirname(file), url)), 'utf8'));
          }
        }
      }

      const fileStructure = _this4.cache[file] = new _file.FileStructure({
        file,
        globals: _this4.flags
      }),
            lines = content.split(/\r?\n|\r/);
      let original, info;

      if (sourceMap) {
        const originalMap = [];
        sourceMap.eachMapping(el => {
          originalMap.push({
            generated: {
              line: el.generatedLine,
              column: el.generatedColumn
            },
            original: {
              line: el.originalLine,
              column: el.originalColumn
            },
            source: el.source,
            name: el.name
          });
        });

        if (sourceMap.sourcesContent) {
          $C(sourceMap.sourcesContent).forEach((content, i) => {
            const src = sourceMap.sources[i];
            $C(originalMap).forEach(el => {
              if (el.source === src) {
                el.source = Parser.normalizePath(path.resolve(el.source));

                if (_this4.sourceRoot) {
                  el.source = Parser.getRelativePath(_this4.sourceRoot, el.source);
                }

                el.sourcesContent = content;
              }
            });
          });
        }

        original = $C(originalMap).group('generated.line');
      }

      for (let i = 0; i < lines.length; i++) {
        const pos = i + 1,
              line = lines[i],
              val = line + _this4.eol;

        if (_this4.sourceMaps) {
          if (original) {
            info = original[pos] || {
              ignore: true
            };
          } else {
            info = {
              generated: {
                column: 0
              },
              original: {
                line: pos,
                column: 0
              },
              source: _this4.sourceRoot ? Parser.getRelativePath(_this4.sourceRoot, file) : file,
              sourcesContent: content || _this4.eol,
              line
            };
          }
        }

        if (line.match(/^\s*\/\/#(.*)/)) {
          if (RegExp.$1) {
            const command = RegExp.$1.split(' '),
                  dir = command.shift();
            const key = `_${dir}`,
                  params = command.join(' ');

            if (_this4[key]) {
              try {
                yield _this4[key](fileStructure, params);
              } catch (err) {
                err.fileName = file;
                err.lineNumber = i + 1;
                throw err;
              }
            } else {
              fileStructure.addCode(val, info);
            }
          }
        } else {
          fileStructure.addCode(val, info);
        }
      }

      return {
        fileStructure,
        file
      };
    })();
  }
  /**
   * Directive #include
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _include(struct, value) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      return $C((yield _this5.parsePath(struct.file, value))).async.forEach(
      /*#__PURE__*/
      function () {
        var _ref3 = _asyncToGenerator(function* (el) {
          const includeFileName = String(el.shift());
          el = $C(el).reduce((map, el) => (map[el] = true, map), {});

          if (includeFileName) {
            struct.addInclude((yield _this5.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
          } else {
            $C(el).forEach((el, key) => struct.root.labels[key] = true);
          }
        });

        return function (_x3) {
          return _ref3.apply(this, arguments);
        };
      }());
    })();
  }
  /**
   * Directive #without
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _without(struct, value) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      return $C((yield _this6.parsePath(struct.file, value))).async.forEach(
      /*#__PURE__*/
      function () {
        var _ref4 = _asyncToGenerator(function* (el) {
          const includeFileName = String(el.shift());
          el = $C(el).reduce((map, el) => (map[el] = true, map), {});
          struct.addWithout((yield _this6.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
        });

        return function (_x4) {
          return _ref4.apply(this, arguments);
        };
      }());
    })();
  }
  /**
   * Directive #end
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _end(struct, value) {
    value = value.trim();

    if (!value) {
      throw new SyntaxError('Bad "#end" directive');
    }

    const args = value.split(/\s+/),
          key = `_end${args[0]}`;

    if (!this[key]) {
      throw new SyntaxError(`Bad value (${args[0]}) for "#end" directive`);
    }

    this[key](struct, args.join(' '));
  }
  /**
   * Directive #label
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _label(struct, value) {
    struct.beginLabel(value);
  }
  /**
   * Directive #endlabel
   *
   * @private
   * @param {!FileStructure} struct - file structure
   */


  _endlabel(struct) {
    struct.endLabel();
  }
  /**
   * Directive #if
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   * @param {boolean=} [opt_unless] - unless mode
   */


  _if(struct, value, opt_unless) {
    value = value.trim();

    if (!value) {
      throw new SyntaxError(`Bad "#${opt_unless ? 'unless' : 'if'}" directive`);
    }

    let args = value.split(/\s+/);

    switch (args.length) {
      case 1:
        args.push('is', true);
        break;

      case 2:
        args.push(true);
        break;
    }

    args = args.slice(0, 2).concat(Parser.parseExpr(args.length > 3 ? args.slice(2).join(' ') : args[2]), opt_unless);
    struct.beginIf(...args);
  }
  /**
   * Directive #endif
   *
   * @private
   * @param {!FileStructure} struct - file structure
   */


  _endif(struct) {
    struct.endIf();
  }
  /**
   * Directive #unless
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _unless(struct, value) {
    this._if(struct, value, true);
  }
  /**
   * Directive #endunless
   *
   * @private
   * @param {!FileStructure} struct - file structure
   */


  _endunless(struct) {
    struct.endIf();
  }
  /**
   * Directive #set
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _set(struct, value) {
    value = value.trim();

    if (!value) {
      throw new SyntaxError('Bad "#set" directive');
    }

    const args = value.split(/\s+/);
    struct.addSet(args[0], Parser.parseExpr(args.slice(1).join(' ')));
  }
  /**
   * Directive #unset
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  _unset(struct, value) {
    value = value.trim();

    if (!value) {
      throw new SyntaxError('Bad "#unset" directive');
    }

    struct.addUnset(value);
  }

}

exports.default = Parser;
