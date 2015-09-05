/*!
 * Monic v2.3.4
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Sat, 05 Sep 2015 13:08:56 GMT
 */

'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _okay = require('okay');

var _okay2 = _interopRequireDefault(_okay);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _async = require('async');

var async = _interopRequireWildcard(_async);

var _file = require('./file');

var _sourceMap = require('source-map');

var _collectionJs = require('collection.js');

/**
 * Parser class
 */

var Parser = (function () {
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
		this.flags = _collectionJs.$C.extend(false, {}, flags);
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

	Parser.normalizePath = function normalizePath(src) {
		return path.normalize(src).split(path.sep).join('/');
	};

	/**
  * Solves the relative path from "from" to "to"
  *
  * @param {string} from
  * @param {string} to
  * @return {string}
  */

	Parser.getRelativePath = function getRelativePath(from, to) {
		return Parser.normalizePath(path.relative(from, to));
	};

	/**
  * Checks a file for existence
  * and returns an absolute path to it
  *
  * @param {string} file - file path
  * @param {function(Error, string=)} callback - callback function
  */

	Parser.prototype.testFile = function testFile(file, callback) {
		// istanbul ignore next

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
	};

	/**
  * Parses a path with glob
  *
  * @param {string} base - path to a base file
  * @param {string} src - path
  * @param {function(Error, !Array=)} callback - callback function
  */

	Parser.prototype.parsePath = function parsePath(base, src, callback) {
		// istanbul ignore next

		var _this2 = this;

		var parts = src.split('::'),
		    dirname = path.dirname(base);

		parts[0] = parts[0].replace(/\$\{(.*?)}/g, function (sstr, flag) {
			return flag in _this2.flags ? _this2.flags[flag] : '';
		});

		var pattern = path.join(dirname, parts[0]);

		if (_glob2['default'].hasMagic(pattern)) {
			_glob2['default'](pattern, null, _okay2['default'](callback, function (files) {
				callback(null, _collectionJs.$C(files).reduce(function (res, el) {
					parts[0] = path.relative(dirname, el);
					res.push(parts.slice());
					return res;
				}, []));
			}));
		} else {
			callback(null, [parts]);
		}
	};

	/**
  * Parses a file and returns it structure
  *
  * @param {string} file - file path
  * @param {function(Error, !FileStructure=, string=)} callback - callback function
  */

	Parser.prototype.parseFile = function parseFile(file, callback) {
		// istanbul ignore next

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
	};

	/**
  * Parses a text and returns it structure
  *
  * @param {string} file - file path
  * @param {string} content - source text
  * @param {function(Error, !FileStructure=, string=)} callback - callback function
  */

	Parser.prototype.parse = function parse(file, content, callback) {
		// istanbul ignore next

		var _this4 = this;

		if (this.cache[file]) {
			return callback(null, this.cache[file], file);
		}

		var actions = [];

		_collectionJs.$C(this.replacers).forEach(function (replacer) {
			actions.push(function (next) {
				if (replacer.length > 2) {
					replacer.call(_this4, content, file, function (err, res) {
						return next(err, err ? void 0 : content = res);
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
				sourceMap = new _sourceMap.SourceMapConsumer(this.inputSourceMap);
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
								sourceMap = new _sourceMap.SourceMapConsumer(JSON.parse(str));
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

		async.series(actions, _okay2['default'](callback, function () {
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

				var asyncParseCallback = _okay2['default'](error, function () {
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
							_collectionJs.$C(sourceMap.sourcesContent).forEach(function (content, i) {
								var src = sourceMap.sources[i];

								_collectionJs.$C(originalMap).forEach(function (el) {
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

						original = _collectionJs.$C(originalMap).group('generated > line');
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
							} else if (_this4[key]) {
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
	};

	/**
  * Directive #include
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  * @param {function(Error=)} callback - callback function
  */

	Parser.prototype._include = function _include(struct, value, callback) {
		// istanbul ignore next

		var _this5 = this;

		this.parsePath(struct.file, value, _okay2['default'](callback, function (arr) {
			var actions = _collectionJs.$C(arr).reduce(function (arr, el) {
				return (arr.push(function (next) {
					return action.call(_this5, el, next);
				}), arr);
			}, []);

			async.series(actions, callback);
		}));

		function action(param, next) {
			var includeFileName = String(param.shift());

			param = _collectionJs.$C(param).reduce(function (map, el) {
				return (map[el] = true, map);
			}, {});

			if (includeFileName) {
				this.parseFile(struct.getRelativePathOf(includeFileName), _okay2['default'](next, function (includeFile) {
					struct.addInclude(includeFile, param);
					next();
				}));
			} else {
				_collectionJs.$C(param).forEach(function (el, key) {
					return struct.root.labels[key] = true;
				});
				next();
			}
		}
	};

	/**
  * Directive #without
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  * @param {function(Error=)} callback - callback function
  */

	Parser.prototype._without = function _without(struct, value, callback) {
		// istanbul ignore next

		var _this6 = this;

		this.parsePath(struct.file, value, _okay2['default'](callback, function (arr) {
			var actions = _collectionJs.$C(arr).reduce(function (arr, el) {
				return (arr.push(function (next) {
					return action.call(_this6, el, next);
				}), arr);
			}, []);

			async.series(actions, callback);
		}));

		function action(param, next) {
			var includedFile = struct.getRelativePathOf(String(param.shift()));

			param = _collectionJs.$C(param).reduce(function (map, el) {
				return (map[el] = true, map);
			}, {});

			this.parseFile(includedFile, _okay2['default'](next, function (includeFile) {
				struct.addWithout(includeFile, param);
				next();
			}));
		}
	};

	/**
  * Directive #end
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  */

	Parser.prototype._end = function _end(struct, value) {
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
	};

	/**
  * Directive #label
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  */

	Parser.prototype._label = function _label(struct, value) {
		struct.beginLabel(value);
	};

	/**
  * Directive #endlabel
  *
  * @private
  * @param {!FileStructure} struct - file structure
  */

	Parser.prototype._endlabel = function _endlabel(struct) {
		struct.endLabel();
	};

	/**
  * Directive #if
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  * @param {boolean=} [opt_unless] - unless mode
  */

	Parser.prototype._if = function _if(struct, value, opt_unless) {
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

		struct.beginIf.apply(struct, args.concat(opt_unless));
	};

	/**
  * Directive #endif
  *
  * @private
  * @param {!FileStructure} struct - file structure
  */

	Parser.prototype._endif = function _endif(struct) {
		struct.endIf();
	};

	/**
  * Directive #unless
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  */

	Parser.prototype._unless = function _unless(struct, value) {
		this._if(struct, value, true);
	};

	/**
  * Directive #endunless
  *
  * @private
  * @param {!FileStructure} struct - file structure
  */

	Parser.prototype._endunless = function _endunless(struct) {
		struct.endIf();
	};

	/**
  * Directive #set
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  */

	Parser.prototype._set = function _set(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#set" directive');
		}

		struct.addSet.apply(struct, value.split(/\s+/));
	};

	/**
  * Directive #unset
  *
  * @private
  * @param {!FileStructure} struct - file structure
  * @param {string} value - directive value
  */

	Parser.prototype._unset = function _unset(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#unset" directive');
		}

		struct.addUnset(value);
	};

	return Parser;
})();

exports['default'] = Parser;
module.exports = exports['default'];