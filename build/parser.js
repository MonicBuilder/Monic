/*!
 * Monic v2.1.10
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Wed, 06 May 2015 12:02:58 GMT
 */

'use strict';

exports.__esModule = true;
// istanbul ignore next

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

// istanbul ignore next

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _FileStructure = require('./file');

var _SourceMapConsumer = require('source-map');

var _$C = require('collection.js');

/**
 * Parser class
 */

var Parser = (function () {
	/**
  * @param {string} eol - EOL symbol
  * @param {Array=} [replacers] - an array of transform functions
  * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
  * @param {Object=} [inputSourceMap] - a source map object that the output source map will be based on
  * @param {?string=} [sourceRoot] - the root for all URLs in the generated source map
  */

	function Parser(_ref) {
		var eol = _ref.eol;
		var replacers = _ref.replacers;
		var sourceMaps = _ref.sourceMaps;
		var sourceRoot = _ref.sourceRoot;
		var inputSourceMap = _ref.inputSourceMap;

		_classCallCheck(this, Parser);

		this.eol = eol;
		this.replacers = replacers;
		this.sourceMaps = sourceMaps;
		this.inputSourceMap = inputSourceMap;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
	}

	/**
  * Normalizes a path
  *
  * @param {string} src - the path
  * @return {string}
  */

	Parser.normalizePath = function normalizePath(src) {
		return _path2['default'].normalize(src).split(_path2['default'].sep).join('/');
	};

	/**
  * Solves the relative path from "from" to "to"
  *
  * @param {string} from
  * @param {string} to
  * @return {string}
  */

	Parser.getRelativePath = function getRelativePath(from, to) {
		return Parser.normalizePath(_path2['default'].relative(from, to));
	};

	/**
  * Checks a file for existence
  * and returns an absolute path to it
  *
  * @param {string} file - the file path
  * @param {function(Error, string=)} callback - a callback function
  */

	Parser.prototype.testFile = function testFile(file, callback) {
		var _this = this;

		file = Parser.normalizePath(_path2['default'].resolve(file));

		if (this.realpathCache[file]) {
			callback(null, file);
		} else {
			_async2['default'].waterfall([function (next) {
				return _fs2['default'].stat(file, next);
			}, function (stat, next) {
				if (!stat.isFile()) {
					return next(new Error('"' + file + '" is not a file'));
				}

				_this.realpathCache[file] = true;
				next(null, file);
			}], callback);
		}
	};

	/**
  * Parses path with glob
  *
  * @param {string} base - a path to the base file
  * @param {string} src - the path
  * @param {function(Error, !Array=)} callback - a callback function
  */

	Parser.prototype.parsePath = function parsePath(base, src, callback) {
		var parts = src.split('::'),
		    dirname = _path2['default'].dirname(base),
		    pattern = _path2['default'].join(dirname, parts[0]);

		if (_glob2['default'].hasMagic(pattern)) {
			_glob2['default'](pattern, null, function (err, files) {
				if (err) {
					return callback(err);
				}

				callback(null, _$C.$C(files).reduce(function (res, el) {
					parts[0] = _path2['default'].relative(dirname, el);
					res.push(parts.slice());
					return res;
				}, []));
			});
		} else {
			callback(null, [parts]);
		}
	};

	/**
  * Parses a file and returns it structure
  *
  * @param {string} file - the file path
  * @param {function(Error, !FileStructure=, string=)} callback - a callback function
  */

	Parser.prototype.parseFile = function parseFile(file, callback) {
		var _this2 = this;

		_async2['default'].waterfall([function (next) {
			return _this2.testFile(file, next);
		}, function (src, next) {
			if (_this2.cache[src]) {
				return next(null, src, _this2.cache[src]);
			}

			_fs2['default'].readFile(src, 'utf8', function (err, content) {
				next(err, src, content);
			});
		}, function (src, content, next) {
			if (typeof content !== 'string') {
				return next(null, content, src);
			}

			_this2.parse(src, content, next);
		}], callback);
	};

	/**
  * Parses a text and returns it structure
  *
  * @param {string} file - a path to a file
  * @param {string} content - the source text
  * @param {function(Error, !FileStructure=, string=)} callback - a callback function
  */

	Parser.prototype.parse = function parse(file, content, callback) {
		var _this3 = this;

		if (this.cache[file]) {
			return callback(null, this.cache[file], file);
		}

		var actions = [];

		_$C.$C(this.replacers).forEach(function (replacer) {
			actions.push(function (next) {
				if (replacer.length > 2) {
					replacer.call(_this3, content, file, function (err, res) {
						return next(err, err ? void 0 : content = res);
					});
				} else {
					try {
						content = replacer.call(_this3, content, file);
						next();
					} catch (err) {
						err.fileName = file;
						next(err);
					}
				}
			});
		});

		var sourceMap = void 0;
		if (this.sourceMaps) {
			if (this.inputSourceMap) {
				sourceMap = new _SourceMapConsumer.SourceMapConsumer(this.inputSourceMap);
			} else {
				content = content.replace(/(?:\r?\n|\r)?[^\S\r\n]*\/\/(?:#|@) sourceMappingURL=([^\r\n]*)\s*$/, function (sstr, url) {
					actions.push(function (next) {
						if (/data:application\/json;base64,(.*)/.exec(url)) {
							parse(new Buffer(RegExp.$1, 'base64').toString());
						} else {
							_fs2['default'].readFile(_path2['default'].normalize(_path2['default'].resolve(_path2['default'].dirname(file), url)), 'utf8', function (err, str) {
								parse(str);
							});
						}

						function parse(str) {
							try {
								sourceMap = new _SourceMapConsumer.SourceMapConsumer(JSON.parse(str));
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

		_async2['default'].series(actions, function (err) {
			if (err) {
				return callback(err);
			}

			var fileStructure = new _FileStructure.FileStructure({ file: file, eol: _this3.eol }),
			    lines = content.split(/\r?\n|\r/);

			_this3.cache[file] = fileStructure;
			var parseLines = function parseLines(start) {
				var info = void 0,
				    i = void 0;

				function error(err) {
					err.fileName = file;
					err.lineNumber = i + 1;
					callback(err);
				}

				function asyncParseCallback(err) {
					if (err) {
						return error(err);
					}

					parseLines(i + 1);
				}

				var original = void 0;
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
							_$C.$C(sourceMap.sourcesContent).forEach(function (content, i) {
								var src = sourceMap.sources[i];

								_$C.$C(originalMap).forEach(function (el) {
									if (el.source === src) {
										el.source = Parser.normalizePath(_path2['default'].resolve(el.source));

										if (_this3.sourceRoot) {
											el.source = Parser.getRelativePath(_this3.sourceRoot, el.source);
										}

										el.sourcesContent = content;
									}
								});
							});
						}

						original = _$C.$C(originalMap).group('generated > line');
					})();
				}

				for (i = start; i < lines.length; i++) {
					var pos = i + 1,
					    line = lines[i],
					    val = line + _this3.eol;

					if (_this3.sourceMaps) {
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

								source: _this3.sourceRoot ? Parser.getRelativePath(_this3.sourceRoot, file) : file,

								sourcesContent: content || _this3.eol,
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
								return _this3[key](fileStructure, params, asyncParseCallback);
							} else if (_this3[key]) {
								try {
									_this3[key](fileStructure, params);
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
		});
	};

	/**
  * Directive #include
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  * @param {string} value - a value of the directive
  * @param {function(Error=)} callback - a callback function
  */

	Parser.prototype._include = function _include(struct, value, callback) {
		var _this4 = this;

		this.parsePath(struct.file, value, function (err, arr) {
			if (err) {
				return callback(err);
			}

			var actions = [];

			_$C.$C(arr).forEach(function (paramsParts) {
				actions.push(function (next) {
					return action.call(_this4, paramsParts, next);
				});
			});

			_async2['default'].series(actions, callback);
		});

		function action(paramsParts, next) {
			var includeFileName = paramsParts.shift();

			paramsParts = _$C.$C(paramsParts).reduce(function (res, el) {
				res[el] = true;
				return res;
			}, {});

			if (includeFileName) {
				this.parseFile(struct.getRelativePathOf(includeFileName), function (err, includeFile) {
					if (err) {
						return next(err);
					}

					struct.addInclude(includeFile, paramsParts);
					next();
				});
			} else {
				_$C.$C(paramsParts).forEach(function (el, key) {
					struct.root.labels[key] = true;
				});

				next();
			}
		}
	};

	/**
  * Directive #without
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  * @param {string} value - a value of the directive
  * @param {function(Error=)} callback - a callback function
  */

	Parser.prototype._without = function _without(struct, value, callback) {
		var _this5 = this;

		this.parsePath(struct.file, value, function (err, arr) {
			if (err) {
				return callback(err);
			}

			var actions = [];

			_$C.$C(arr).forEach(function (paramsParts) {
				actions.push(function (next) {
					return action.call(_this5, paramsParts, next);
				});
			});

			_async2['default'].series(actions, callback);
		});

		function action(paramsParts, next) {
			var includedFile = struct.getRelativePathOf(paramsParts.shift());

			paramsParts = _$C.$C(paramsParts).reduce(function (res, el) {
				res[el] = true;
				return res;
			}, {});

			this.parseFile(includedFile, function (err, includeFile) {
				if (err) {
					return next(err);
				}

				struct.addWithout(includeFile, paramsParts);
				next();
			});
		}
	};

	/**
  * Directive #label
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._label = function _label(struct, value) {
		struct.beginLabel(value);
	};

	/**
  * Directive #endlabel
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  */

	Parser.prototype._endlabel = function _endlabel(struct) {
		struct.endLabel();
	};

	/**
  * Directive #if
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._if = function _if(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "if" directive');
		}

		var args = value.split(/\s+/);

		var res = true;
		if (args.length > 1 && args[0] === 'not') {
			res = false;
			args.shift();
		}

		struct.beginIf(args[0], res);
	};

	/**
  * Directive #endif
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  */

	Parser.prototype._endif = function _endif(struct) {
		struct.endIf();
	};

	/**
  * Directive #set
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._set = function _set(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "set" directive');
		}

		struct.addSet(value);
	};

	/**
  * Directive #unset
  *
  * @private
  * @param {!FileStructure} struct - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._unset = function _unset(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "unset" directive');
		}

		struct.addUnset(value);
	};

	return Parser;
})();

exports['default'] = Parser;
module.exports = exports['default'];