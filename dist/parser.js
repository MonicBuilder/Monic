/*!
 * Monic v2.3.10
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Mon, 29 Feb 2016 12:37:28 GMT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _file = require('./file');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ok = require('okay'),
    glob = require('glob');

var path = require('path'),
    fs = require('fs'),
    async = require('async');

var _require = require('source-map');

var SourceMapConsumer = _require.SourceMapConsumer;

var _require2 = require('collection.js');

var $C = _require2.$C;

/**
 * Parser class
 */

var Parser = function () {
	/**
  * @param {string} eol - EOL symbol
  * @param {Array=} [replacers] - array of transform functions
  * @param {Object=} [flags] - map of global Monic flags
  * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
  * @param {Object=} [inputSourceMap] - base source map object for the output source map
  * @param {?string=} [sourceRoot] - root for all URLs in the generated source map
  */

	function Parser(_ref) {
		var eol = _ref.eol;
		var replacers = _ref.replacers;
		var flags = _ref.flags;
		var sourceMaps = _ref.sourceMaps;
		var sourceRoot = _ref.sourceRoot;
		var inputSourceMap = _ref.inputSourceMap;

		_classCallCheck(this, Parser);

		this.eol = eol;
		this.replacers = replacers;
		this.flags = Object.assign({}, flags);
		this.sourceMaps = sourceMaps;
		this.inputSourceMap = inputSourceMap;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
	}

	/**
  * Normalizes a path
  *
  * @param {string} src - path
  * @return {string}
  */


	_createClass(Parser, [{
		key: 'testFile',


		/**
   * Checks a file for existence
   * and returns an absolute path to it
   *
   * @param {string} file - file path
   * @param {function(Error, string=)} callback - callback function
   */
		value: function testFile(file, callback) {
			var _this = this;

			file = Parser.normalizePath(path.resolve(file));

			if (this.realpathCache[file]) {
				callback(null, file);
			} else {
				async.waterfall([function (next) {
					return fs.stat(file, next);
				}, function (stat, next) {
					if (!stat.isFile()) {
						return next(new Error('"' + file + '" is not a file'));
					}

					_this.realpathCache[file] = true;
					next(null, file);
				}], callback);
			}
		}

		/**
   * Parses a path with glob
   *
   * @param {string} base - path to a base file
   * @param {string} src - path
   * @param {function(Error, !Array=)} callback - callback function
   */

	}, {
		key: 'parsePath',
		value: function parsePath(base, src, callback) {
			var _this2 = this;

			var parts = src.split('::'),
			    dirname = path.dirname(base);

			parts[0] = parts[0].replace(/\$\{(.*?)}/g, function (sstr, flag) {
				return flag in _this2.flags ? _this2.flags[flag] : '';
			});

			var pattern = path.join(dirname, parts[0]);

			if (glob.hasMagic(pattern)) {
				glob(pattern, null, ok(callback, function (files) {
					callback(null, $C(files).reduce(function (res, el) {
						parts[0] = path.relative(dirname, el);
						res.push(parts.slice());
						return res;
					}, []));
				}));
			} else {
				callback(null, [parts]);
			}
		}

		/**
   * Parses a file and returns it structure
   *
   * @param {string} file - file path
   * @param {function(Error, !FileStructure=, string=)} callback - callback function
   */

	}, {
		key: 'parseFile',
		value: function parseFile(file, callback) {
			var _this3 = this;

			async.waterfall([function (next) {
				return _this3.testFile(file, next);
			}, function (src, next) {
				if (_this3.cache[src]) {
					return next(null, src, _this3.cache[src]);
				}

				fs.readFile(src, 'utf8', function (err, content) {
					return next(err, src, content);
				});
			}, function (src, content, next) {
				if (typeof content !== 'string') {
					return next(null, content, src);
				}

				_this3.parse(src, content, next);
			}], callback);
		}

		/**
   * Parses a text and returns it structure
   *
   * @param {string} file - file path
   * @param {string} content - source text
   * @param {function(Error, !FileStructure=, string=)} callback - callback function
   */

	}, {
		key: 'parse',
		value: function parse(file, content, callback) {
			var _this4 = this;

			if (this.cache[file]) {
				return callback(null, this.cache[file], file);
			}

			var actions = [];

			$C(this.replacers).forEach(function (replacer) {
				actions.push(function (next) {
					if (replacer.length > 2) {
						replacer.call(_this4, content, file, function (err, res) {
							return next(err, err ? undefined : content = res);
						});
					} else {
						try {
							content = replacer.call(_this4, content, file);
							next();
						} catch (err) {
							err.fileName = file;
							next(err);
						}
					}
				});
			});

			var sourceMap = undefined;
			if (this.sourceMaps) {
				if (this.inputSourceMap) {
					sourceMap = new SourceMapConsumer(this.inputSourceMap);
				} else {
					content = content.replace(/(?:\r?\n|\r)?[^\S\r\n]*\/\/(?:#|@) sourceMappingURL=([^\r\n]*)\s*$/, function (sstr, url) {
						actions.push(function (next) {
							if (/data:application\/json;base64,(.*)/.exec(url)) {
								parse(new Buffer(RegExp.$1, 'base64').toString());
							} else {
								fs.readFile(path.normalize(path.resolve(path.dirname(file), url)), 'utf8', function (err, str) {
									parse(str);
								});
							}

							function parse(str) {
								try {
									sourceMap = new SourceMapConsumer(JSON.parse(str));
									content = content.replace(sstr, '');
								} catch (ignore) {} finally {
									next();
								}
							}
						});

						return sstr;
					});
				}
			}

			async.series(actions, ok(callback, function () {
				var fileStructure = new _file.FileStructure({ file: file, globals: _this4.flags }),
				    lines = content.split(/\r?\n|\r/);

				_this4.cache[file] = fileStructure;
				var parseLines = function parseLines(start) {
					var info = undefined,
					    i = undefined;

					function error(err) {
						err.fileName = file;
						err.lineNumber = i + 1;
						callback(err);
					}

					var asyncParseCallback = ok(error, function () {
						return parseLines(i + 1);
					});

					var original = undefined;
					if (sourceMap) {
						(function () {
							var originalMap = [];
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
									var src = sourceMap.sources[i];

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

							original = $C(originalMap).group('generated > line');
						})();
					}

					for (i = start; i < lines.length; i++) {
						var pos = i + 1,
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
								var command = RegExp.$1.split(' '),
								    dir = command.shift();

								var key = '_' + dir,
								    params = command.join(' ');

								if (/^(?:include|without)$/.test(dir)) {
									return _this4[key](fileStructure, params, asyncParseCallback);
								}

								if (_this4[key]) {
									try {
										_this4[key](fileStructure, params);
									} catch (err) {
										return error(err);
									}
								} else {
									fileStructure.addCode(val, info);
								}
							}
						} else {
							fileStructure.addCode(val, info);
						}
					}

					callback(null, fileStructure, file);
				};

				parseLines(0);
			}));
		}

		/**
   * Directive #include
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   * @param {function(Error=)} callback - callback function
   */

	}, {
		key: '_include',
		value: function _include(struct, value, callback) {
			var _this5 = this;

			this.parsePath(struct.file, value, ok(callback, function (arr) {
				var actions = $C(arr).reduce(function (arr, el) {
					return arr.push(function (next) {
						return action.call(_this5, el, next);
					}), arr;
				}, []);

				async.series(actions, callback);
			}));

			function action(param, next) {
				var includeFileName = String(param.shift());

				param = $C(param).reduce(function (map, el) {
					return map[el] = true, map;
				}, {});

				if (includeFileName) {
					this.parseFile(struct.getRelativePathOf(includeFileName), ok(next, function (includeFile) {
						struct.addInclude(includeFile, param);
						next();
					}));
				} else {
					$C(param).forEach(function (el, key) {
						return struct.root.labels[key] = true;
					});
					next();
				}
			}
		}

		/**
   * Directive #without
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   * @param {function(Error=)} callback - callback function
   */

	}, {
		key: '_without',
		value: function _without(struct, value, callback) {
			var _this6 = this;

			this.parsePath(struct.file, value, ok(callback, function (arr) {
				var actions = $C(arr).reduce(function (arr, el) {
					return arr.push(function (next) {
						return action.call(_this6, el, next);
					}), arr;
				}, []);

				async.series(actions, callback);
			}));

			function action(param, next) {
				var includedFile = struct.getRelativePathOf(String(param.shift()));

				param = $C(param).reduce(function (map, el) {
					return map[el] = true, map;
				}, {});

				this.parseFile(includedFile, ok(next, function (includeFile) {
					struct.addWithout(includeFile, param);
					next();
				}));
			}
		}

		/**
   * Directive #end
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */

	}, {
		key: '_end',
		value: function _end(struct, value) {
			value = value.trim();

			if (!value) {
				throw new SyntaxError('Bad "#end" directive');
			}

			var args = value.split(/\s+/),
			    key = '_end' + args[0];

			if (!this[key]) {
				throw new SyntaxError('Bad value (' + args[0] + ') for "#end" directive');
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

	}, {
		key: '_label',
		value: function _label(struct, value) {
			struct.beginLabel(value);
		}

		/**
   * Directive #endlabel
   *
   * @private
   * @param {!FileStructure} struct - file structure
   */

	}, {
		key: '_endlabel',
		value: function _endlabel(struct) {
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

	}, {
		key: '_if',
		value: function _if(struct, value, opt_unless) {
			value = value.trim();

			var args = value.split(/\s+/);

			switch (args.length) {
				case 1:
					args.push('eq', true);
					break;

				case 2:
					args.push(true);
					break;
			}

			if (!value || args.length !== 3) {
				throw new SyntaxError('Bad "#' + (opt_unless ? 'unless' : 'if') + '" directive');
			}

			struct.beginIf.apply(struct, _toConsumableArray(args.concat(opt_unless)));
		}

		/**
   * Directive #endif
   *
   * @private
   * @param {!FileStructure} struct - file structure
   */

	}, {
		key: '_endif',
		value: function _endif(struct) {
			struct.endIf();
		}

		/**
   * Directive #unless
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */

	}, {
		key: '_unless',
		value: function _unless(struct, value) {
			this._if(struct, value, true);
		}

		/**
   * Directive #endunless
   *
   * @private
   * @param {!FileStructure} struct - file structure
   */

	}, {
		key: '_endunless',
		value: function _endunless(struct) {
			struct.endIf();
		}

		/**
   * Directive #set
   *
   * @private
   * @param {!FileStructure} struct - file structure
   * @param {string} value - directive value
   */

	}, {
		key: '_set',
		value: function _set(struct, value) {
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

	}, {
		key: '_unset',
		value: function _unset(struct, value) {
			value = value.trim();

			if (!value) {
				throw new SyntaxError('Bad "#unset" directive');
			}

			struct.addUnset(value);
		}
	}], [{
		key: 'normalizePath',
		value: function normalizePath(src) {
			return path.normalize(src).split(path.sep).join('/');
		}

		/**
   * Solves the relative path from "from" to "to"
   *
   * @param {string} from
   * @param {string} to
   * @return {string}
   */

	}, {
		key: 'getRelativePath',
		value: function getRelativePath(from, to) {
			return Parser.normalizePath(path.relative(from, to));
		}
	}]);

	return Parser;
}();

exports.default = Parser;
