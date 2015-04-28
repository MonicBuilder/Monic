/*!
 * Monic v2.0.0
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Tue, 28 Apr 2015 18:05:33 GMT
 */

// istanbul ignore next
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

// istanbul ignore next

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

exports.__esModule = true;

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

/**
 * Parser class
 */

var Parser = (function () {
	/**
  * @param {string} eol - EOL symbol
  * @param {Array=} [replacers] - an array of transform functions
  * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
  * @param {?string=} [sourceRoot] - the root for all URLs in the generated source map
  */

	function Parser(_ref) {
		var eol = _ref.eol;
		var replacers = _ref.replacers;
		var sourceMaps = _ref.sourceMaps;
		var sourceRoot = _ref.sourceRoot;

		_classCallCheck(this, Parser);

		this.eol = eol;
		this.replacers = replacers;
		this.sourceMaps = sourceMaps;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
	}

	/**
  * Normalizes URL
  *
  * @param {string} url
  * @return {string}
  */

	Parser.normalizeUrl = function normalizeUrl(url) {
		return _path2['default'].normalize(url).split(_path2['default'].sep).join(_path2['default'].posix.sep);
	};

	/**
  * Solves the relative path from from (dir) to to (file)
  *
  * @param {string} from
  * @param {string} to
  * @return {string}
  */

	Parser.relativeUrl = function relativeUrl(from, to) {
		return Parser.normalizeUrl(_path2['default'].join(_path2['default'].relative(from, _path2['default'].dirname(to)), _path2['default'].basename(to)));
	};

	/**
  * Checks a file for existence
  * and returns an absolute path to it
  *
  * @param {string} file - the file path
  * @param {function(Error, string=)} callback - a callback function
  */

	Parser.prototype.normalizePath = function normalizePath(file, callback) {
		var _this = this;

		file = Parser.normalizeUrl(_path2['default'].resolve(file));

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
  * Parses URL string with glob
  *
  * @param {string} base - a path to the base file
  * @param {string} url
  * @param {function(Error, Array=)} callback - a callback function
  */

	Parser.prototype.parseURL = function parseURL(base, url, callback) {
		var parts = url.split('::'),
		    dirname = _path2['default'].dirname(base);

		_glob2['default'](_path2['default'].join(dirname, parts[0]), null, function (err, files) {
			if (err) {
				return callback(err);
			}

			callback(null, $C(files).reduce(function (res, el) {
				parts[0] = _path2['default'].relative(dirname, el);
				res.push(parts.slice());
				return res;
			}, []));
		});
	};

	/**
  * Parses a file and returns it structure
  *
  * @param {string} file - the file path
  * @param {function(Error, FileStructure=, string=)} callback - a callback function
  */

	Parser.prototype.parseFile = function parseFile(file, callback) {
		var _this2 = this;

		_async2['default'].waterfall([function (next) {
			return _this2.normalizePath(file, next);
		}, function (src, next) {
			if (_this2.cache[src]) {
				return next(null, src, _this2.cache[src]);
			}

			_fs2['default'].readFile(src, function (err, content) {
				next(err, src, String(content));
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
  * @param {function(Error, FileStructure=, string=)} callback - a callback function
  */

	Parser.prototype.parse = function parse(file, content, callback) {
		var _this3 = this;

		if (this.cache[file]) {
			return callback(null, this.cache[file], file);
		}

		var actions = [];

		$C(this.replacers).forEach(function (replacer) {
			actions.push(function (next) {
				if (replacer.length > 2) {
					replacer(content, file, function (err, res) {
						return next(err, err ? void 0 : content = res);
					});
				} else {
					try {
						content = replacer(content, file);
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
			content = content.replace(/(?:\r?\n|\r)?[^\S\r\n]*\/\/# sourceMappingURL=([^\r\n]*)\s*$/, function (sstr, url) {
				actions.push(function (next) {
					if (/data:application\/json;base64,(.*)/.exec(url)) {
						parse(new Buffer(RegExp.$1, 'base64').toString());
					} else {
						_fs2['default'].readFile(_path2['default'].normalize(_path2['default'].resolve(_path2['default'].dirname(file), url)), function (err, str) {
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

		_async2['default'].series(actions, function (err) {
			if (err) {
				return callback(err);
			}

			var fileStructure = new _FileStructure.FileStructure({ file: file, eol: _this3.eol }),
			    lines = content.split(/\r?\n|\r/);

			_this3.cache[file] = fileStructure;
			var parseLines = (function (_parseLines) {
				function parseLines(_x) {
					return _parseLines.apply(this, arguments);
				}

				parseLines.toString = function () {
					return _parseLines.toString();
				};

				return parseLines;
			})(function (start) {
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
							$C(sourceMap.sourcesContent).forEach(function (content, i) {
								var src = sourceMap.sources[i];

								$C(originalMap).forEach(function (el) {
									if (el.source === src) {
										el.source = Parser.normalizeUrl(_path2['default'].resolve(el.source));

										if (_this3.sourceRoot) {
											el.source = Parser.relativeUrl(_this3.sourceRoot, el.source);
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

								source: _this3.sourceRoot ? Parser.relativeUrl(_this3.sourceRoot, file) : file,

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
			});

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

		this.parseURL(struct.file, value, function (err, arr) {
			if (err) {
				return callback(err);
			}

			var actions = [];

			$C(arr).forEach(function (paramsParts) {
				actions.push(function (next) {
					return action.call(_this4, paramsParts, next);
				});
			});

			_async2['default'].series(actions, callback);
		});

		function action(paramsParts, next) {
			var includeFileName = paramsParts.shift();

			paramsParts = $C(paramsParts).reduce(function (res, el) {
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
				$C(paramsParts).forEach(function (el, key) {
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

		this.parseURL(struct.file, value, function (err, arr) {
			if (err) {
				return callback(err);
			}

			var actions = [];

			$C(arr).forEach(function (paramsParts) {
				actions.push(function (next) {
					return action.call(_this5, paramsParts, next);
				});
			});

			_async2['default'].series(actions, callback);
		});

		function action(paramsParts, next) {
			var includedFile = struct.getRelativePathOf(paramsParts.shift());

			paramsParts = $C(paramsParts).reduce(function (res, el) {
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