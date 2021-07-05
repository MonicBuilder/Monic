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
exports.default = void 0;

var _file = require("./file");

const $C = require('collection.js/compiled');

const path = require('path'),
      fs = require('fs-extra'),
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
   * Tries to parse the specified expression as JavaScript
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
      } catch {
        return expr;
      }
    }

    try {
      return new Function(`return ${expr}`)();
    } catch {
      return expr;
    }
  }
  /**
   * Normalizes the specified path
   *
   * @param {string} src
   * @returns {string}
   */


  static normalizePath(src) {
    return path.normalize(src).split(path.sep).join('/');
  }
  /**
   * Solves the specified relative path from "from" to "to"
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
    this.flags = { ...flags
    };
    this.sourceMaps = sourceMaps;
    this.inputSourceMap = inputSourceMap;
    this.sourceRoot = sourceRoot;
    this.realpathCache = {};
    this.cache = {};
  }
  /**
   * Checks the specified file for existence and returns an absolute path to it
   *
   * @param {string} file - file path
   * @returns {string}
   */


  async testFile(file) {
    file = Parser.normalizePath(path.resolve(file));

    if (this.realpathCache[file]) {
      return file;
    }

    if (!(await fs.stat(file)).isFile()) {
      throw new Error(`"${file}" is not a file`);
    }

    this.realpathCache[file] = true;
    return file;
  }
  /**
   * Parses the specified path with glob
   *
   * @param {string} base - path to a base file
   * @param {string} src - path
   * @returns {!Array}
   */


  async parsePath(base, src) {
    const parts = src.split('::'),
          dirname = path.dirname(base);
    parts[0] = parts[0].replace(/\${(.*?)}/g, (str, flag) => {
      if (flag in this.flags) {
        const f = this.flags[flag];

        if (typeof f === 'function') {
          return f({
            flags: this.flags
          });
        }

        return f;
      }

      return '';
    });
    const pattern = path.join(dirname, parts[0]);

    if (hasMagic(pattern)) {
      return $C(await glob(pattern)).reduce((res, el) => {
        parts[0] = path.relative(dirname, el);
        res.push(parts.slice());
        return res;
      }, []);
    }

    return [parts];
  }
  /**
   * Parses the specified file and returns it structure
   *
   * @param {string} file - file path
   * @returns {{fileStructure: (!FileStructure|undefined), file: string}}
   */


  async parseFile(file) {
    const src = await this.testFile(file),
          content = this.cache[src] || (await fs.readFile(src, 'utf8'));

    if (typeof content !== 'string') {
      return {
        fileStructure: content,
        file: src
      };
    }

    return this.parse(src, content);
  }
  /**
   * Parses the specified text and returns it structure
   *
   * @param {string} file - file path
   * @param {string} content - source text
   * @returns {{fileStructure: (!FileStructure|undefined), file: string}}
   */


  async parse(file, content) {
    if (this.cache[file]) {
      return {
        fileStructure: this.cache[file],
        file
      };
    }

    await $C(this.replacers).async.forEach(async replacer => {
      if (replacer.length > 2) {
        return new Promise((resolve, reject) => {
          replacer.call(this, content, file, (err, res) => {
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
        content = await replacer.call(this, content, file);
      } catch (err) {
        err.fileName = file;
        throw err;
      }
    });
    let sourceMap;

    if (this.sourceMaps) {
      if (this.inputSourceMap) {
        sourceMap = new SourceMapConsumer(this.inputSourceMap);
      } else if (/((?:\r?\n|\r)?[^\S\r\n]*\/\/[#@] sourceMappingURL=([^\r\n]*)\s*)$/.test(content)) {
        const [sstr, url] = [RegExp.$1, RegExp.$2];

        const parse = async str => {
          try {
            sourceMap = new SourceMapConsumer(JSON.parse(await str));
            content = content.replace(sstr, '');
          } catch {}
        };

        if (/data:application\/json;base64,(.*)/.exec(url)) {
          await parse(Buffer.from(RegExp.$1, 'base64').toString());
        } else {
          await parse(fs.readFile(path.normalize(path.resolve(path.dirname(file), url)), 'utf8'));
        }
      }
    }

    const fileStructure = this.cache[file] = new _file.FileStructure({
      file,
      globals: this.flags
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

              if (this.sourceRoot) {
                el.source = Parser.getRelativePath(this.sourceRoot, el.source);
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
            val = line + this.eol;

      if (this.sourceMaps) {
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
            source: this.sourceRoot ? Parser.getRelativePath(this.sourceRoot, file) : file,
            sourcesContent: content || this.eol,
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

          if (this[key]) {
            try {
              await this[key](fileStructure, params);
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
  }
  /**
   * Directive #include
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  async _include(struct, value) {
    return $C(await this.parsePath(struct.file, value)).async.forEach(async el => {
      const includeFileName = String(el.shift());
      el = $C(el).reduce((map, el) => (map[el] = true, map), {});

      if (includeFileName) {
        struct.addInclude((await this.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
      } else {
        $C(el).forEach((el, key) => struct.root.labels[key] = true);
      }
    });
  }
  /**
   * Directive #without
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */


  async _without(struct, value) {
    return $C(await this.parsePath(struct.file, value)).async.forEach(async el => {
      const includeFileName = String(el.shift());
      el = $C(el).reduce((map, el) => (map[el] = true, map), {});
      struct.addWithout((await this.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
    });
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
      throw new SyntaxError('Invalid "#end" declaration');
    }

    const args = value.split(/\s+/),
          key = `_end${args[0]}`;

    if (!this[key]) {
      throw new SyntaxError(`Invalid value (${args[0]}) for the "#end" directive`);
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
      throw new SyntaxError(`Invalid "#${opt_unless ? 'unless' : 'if'}" declaration`);
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
      throw new SyntaxError('Invalid "#set" declaration');
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
      throw new SyntaxError('Invalid "#unset" declaration');
    }

    struct.addUnset(value);
  }

}

exports.default = Parser;
