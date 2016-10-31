/*!
 * Monic v2.3.15
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Mon, 31 Oct 2016 21:12:40 GMT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _file = require('./file');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const $C = require('collection.js/compiled');

const path = require('path'),
      fs = require('fs-extra-promise'),
      glob = require('glob-promise');

var _require = require('source-map');

const SourceMapConsumer = _require.SourceMapConsumer;

var _require2 = require('glob');

const hasMagic = _require2.hasMagic;

/**
 * Parser class
 */

class Parser {
	/**
  * @param {string} eol - EOL symbol
  * @param {Array=} [replacers] - array of transform functions
  * @param {Object=} [flags] - map of global Monic flags
  * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
  * @param {Object=} [inputSourceMap] - base source map object for the output source map
  * @param {?string=} [sourceRoot] - root for all URLs in the generated source map
  */
	constructor(_ref) {
		let eol = _ref.eol;
		let replacers = _ref.replacers;
		let flags = _ref.flags;
		let sourceMaps = _ref.sourceMaps;
		let sourceRoot = _ref.sourceRoot;
		let inputSourceMap = _ref.inputSourceMap;

		this.eol = eol;
		this.replacers = replacers;
		this.flags = _extends({}, flags);
		this.sourceMaps = sourceMaps;
		this.inputSourceMap = inputSourceMap;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
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
				throw new Error(`"${ file }" is not a file`);
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

			parts[0] = parts[0].replace(/\$\{(.*?)}/g, function (sstr, flag) {
				return flag in _this2.flags ? _this2.flags[flag] : '';
			});

			const pattern = path.join(dirname, parts[0]);

			if (hasMagic(pattern)) {
				return $C((yield glob(pattern))).reduce(function (res, el) {
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
				return { fileStructure: content, file: src };
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
				return { fileStructure: _this4.cache[file], file: file };
			}

			yield $C(_this4.replacers).async.forEach((() => {
				var _ref2 = _asyncToGenerator(function* (replacer) {
					if (replacer.length > 2) {
						return new Promise(function (resolve, reject) {
							replacer.call(_this4, content, file, function (err, res) {
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
					return _ref2.apply(this, arguments);
				};
			})());

			let sourceMap;
			if (_this4.sourceMaps) {
				if (_this4.inputSourceMap) {
					sourceMap = new SourceMapConsumer(_this4.inputSourceMap);
				} else if (/((?:\r?\n|\r)?[^\S\r\n]*\/\/(?:#|@) sourceMappingURL=([^\r\n]*)\s*)$/.test(content)) {
					const sstr = RegExp.$1;
					const url = RegExp.$2;


					const parse = (() => {
						var _ref3 = _asyncToGenerator(function* (str) {
							try {
								sourceMap = new SourceMapConsumer(JSON.parse((yield str)));
								content = content.replace(sstr, '');
							} catch (ignore) {}
						});

						return function parse(_x2) {
							return _ref3.apply(this, arguments);
						};
					})();

					if (/data:application\/json;base64,(.*)/.exec(url)) {
						parse(new Buffer(RegExp.$1, 'base64').toString());
					} else {
						yield parse(fs.readFileAsync(path.normalize(path.resolve(path.dirname(file), url)), 'utf8'));
					}
				}
			}

			const fileStructure = _this4.cache[file] = new _file.FileStructure({ file: file, globals: _this4.flags }),
			      lines = content.split(/\r?\n|\r/);

			let original, info;

			if (sourceMap) {
				const originalMap = [];

				sourceMap.eachMapping(function (el) {
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
					$C(sourceMap.sourcesContent).forEach(function (content, i) {
						const src = sourceMap.sources[i];

						$C(originalMap).forEach(function (el) {
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
						info = original[pos] || { ignore: true };
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
							line: line
						};
					}
				}

				if (line.match(/^\s*\/\/#(.*)/)) {
					if (RegExp.$1) {
						const command = RegExp.$1.split(' '),
						      dir = command.shift();

						const key = `_${ dir }`,
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

			return { fileStructure: fileStructure, file: file };
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
			return $C((yield _this5.parsePath(struct.file, value))).async.forEach((() => {
				var _ref4 = _asyncToGenerator(function* (el) {
					const includeFileName = String(el.shift());
					el = $C(el).reduce(function (map, el) {
						return map[el] = true, map;
					}, {});

					if (includeFileName) {
						struct.addInclude((yield _this5.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
					} else {
						$C(el).forEach(function (el, key) {
							return struct.root.labels[key] = true;
						});
					}
				});

				return function (_x3) {
					return _ref4.apply(this, arguments);
				};
			})());
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
			return $C((yield _this6.parsePath(struct.file, value))).async.forEach((() => {
				var _ref5 = _asyncToGenerator(function* (el) {
					const includeFileName = String(el.shift());
					el = $C(el).reduce(function (map, el) {
						return map[el] = true, map;
					}, {});

					struct.addWithout((yield _this6.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
				});

				return function (_x4) {
					return _ref5.apply(this, arguments);
				};
			})());
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
		      key = `_end${ args[0] }`;

		if (!this[key]) {
			throw new SyntaxError(`Bad value (${ args[0] }) for "#end" directive`);
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

		const args = value.split(/\s+/);

		switch (args.length) {
			case 1:
				args.push('eq', true);
				break;

			case 2:
				args.push(true);
				break;
		}

		if (!value || args.length !== 3) {
			throw new SyntaxError(`Bad "#${ opt_unless ? 'unless' : 'if' }" directive`);
		}

		struct.beginIf.apply(struct, _toConsumableArray(args.concat(opt_unless)));
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

		struct.addSet.apply(struct, _toConsumableArray(value.split(/\s+/)));
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
