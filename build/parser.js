/*!
 * Monic v1.2.0
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Wed, 15 Apr 2015 05:49:45 GMT
 */

// istanbul ignore next
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

// istanbul ignore next

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

exports.__esModule = true;

var _path = require('path');

var _path2 = _interopRequireWildcard(_path);

var _glob = require('glob');

var _glob2 = _interopRequireWildcard(_glob);

var _fs = require('fs');

var _fs2 = _interopRequireWildcard(_fs);

var _async = require('async');

var _async2 = _interopRequireWildcard(_async);

var _MonicError = require('./error');

var _FileStructure = require('./file');

var _$C = require('collection.js');

/**
 * Parser class
 */

var Parser = (function () {
	/**
  * @param {{lineSeparator: string, replacers: !Array}} params - additional parameters:
  *   *) params.lineSeparator - EOL symbol
  *   *) params.replacers - an array of transform functions
  */

	function Parser(params) {
		_classCallCheck(this, Parser);

		this.nl = params.lineSeparator;
		this.replacers = params.replacers || [];
		this.realpathCache = {};
		this.cache = {};
	}

	/**
  * Checks a file for existence
  * and returns an absolute path to it
  *
  * @param {string} file - the file path
  * @param {function(Error, string=)} callback - a callback function
  */

	Parser.prototype.normalizePath = function normalizePath(file, callback) {
		var _this = this;

		file = _path2['default'].normalize(_path2['default'].resolve(file));

		if (this.realpathCache[file]) {
			callback(null, file);
		} else {
			_async2['default'].waterfall([function (callback) {
				_fs2['default'].exists(file, function (exists) {
					callback(null, exists);
				});
			}, function (exists, callback) {
				if (!exists) {
					return callback(new Error('File "' + file + '" not found'));
				}

				_fs2['default'].stat(file, function (err, stat) {
					callback(err, stat);
				});
			}, function (stat, callback) {
				if (!stat.isFile()) {
					return callback(new Error('"' + file + '" is not a file'));
				}

				_this.realpathCache[file] = true;
				callback(null, file);
			}], callback);
		}
	};

	/**
  * Parses a file and returns it structure
  *
  * @param {string} file - the file path
  * @param {function(Error, FileStructure=, string=)} callback - a callback function
  */

	Parser.prototype.parseFile = function parseFile(file, callback) {
		var _this2 = this;

		this.normalizePath(file, function (err, src) {
			if (err) {
				return callback(err);
			}

			if (_this2.cache[src]) {
				return callback(null, _this2.cache[src], src);
			}

			_fs2['default'].readFile(src, 'utf8', function (err, content) {
				if (err) {
					return callback(err);
				}

				_this2.parse(src, content, callback);
			});
		});
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

		var actions = [],
		    dirname = _path2['default'].dirname(file);

		content = this.replacers.reduce(function (content, el) {
			content = el(content, file);
			return content;
		}, content);

		// URL transformers
		content = content.replace(/^(\s*\/\/(?:#include|without)\s+)(.*)/gm, function (sstr, decl, src) {
			if (/\*/.test(src)) {
				actions.push(function (callback) {
					var parts = src.split('::');
					_glob2['default'](_path2['default'].join(dirname, parts[0]), null, function (err, files) {
						if (files) {
							content = content.replace(sstr, files.reduce(function (res, el) {
								parts[0] = _path2['default'].relative(dirname, el);
								res += decl + parts.join('::') + _this3.nl;
								return res;
							}, ''));
						}

						callback(err, files);
					});
				});
			}

			return sstr;
		});

		_async2['default'].parallel(actions, function (err) {
			if (err) {
				return callback(err);
			}

			var fileStructure = new _FileStructure.FileStructure(file, _this3.nl),
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
				var errors = [];

				var i = void 0;

				function appendError(err) {
					var msg = err.message,
					    line = i + 1;

					errors.push(new _MonicError.MonicError(msg, file, line));
					fileStructure.error(msg);
				}

				function asyncParseCallback(err) {
					if (err) {
						appendError(err);
					}

					parseLines(i + 1);
				}

				for (i = start; i < lines.length; i++) {
					var line = lines[i];

					if (line.match(/^\s*\/\/#(.*)/)) {
						if (RegExp.$1) {
							var command = RegExp.$1.split(' '),
							    dir = String(command.shift());

							var key = '_' + dir,
							    params = command.join(' ');

							if (/^(include|without)$/.test(dir)) {
								return _this3[key](fileStructure, params, asyncParseCallback);
							} else if (/^(label|endlabel|if|endif|set|unset)$/.test(dir)) {
								try {
									_this3[key](fileStructure, params);
								} catch (err) {
									appendError(err);
								}
							} else {
								appendError(new Error('Unknown directive ' + dir));
							}
						}
					} else {
						fileStructure.addCode(line + (i < lines.length - 1 ? _this3.nl : ''));
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
  * @param {!FileStructure} file - a file structure
  * @param {string} params - parameters of the directive
  * @param {function(Error=)} callback - a callback function
  */

	Parser.prototype._include = function _include(file, params, callback) {
		var paramsParts = params.split('::'),
		    includeFileName = paramsParts.shift();

		paramsParts = paramsParts.reduce(function (res, el) {
			res[el] = true;
			return res;
		}, {});

		if (includeFileName) {
			this.parseFile(file.getRelativePathOf(includeFileName), function (err, includeFile) {
				if (err) {
					return callback(err);
				}

				file.addInclude(includeFile, paramsParts);
				callback();
			});
		} else {
			_$C.$C(paramsParts).forEach(function (el, key) {
				file.root.labels[key] = true;
			});

			callback();
		}
	};

	/**
  * Directive #without
  *
  * @private
  * @param {!FileStructure} file - a file structure
  * @param {string} value - a value of the directive
  * @param {function(Error=)} callback - a callback function
  */

	Parser.prototype._without = function _without(file, value, callback) {
		var paramsParts = value.split('::'),
		    includeFname = file.getRelativePathOf(paramsParts.shift());

		paramsParts = paramsParts.reduce(function (res, el) {
			res[el] = true;
			return res;
		}, {});

		this.parseFile(includeFname, function (err, includeFile) {
			if (err) {
				return callback(err);
			}

			file.addWithout(includeFile, paramsParts);
			callback();
		});
	};

	/**
  * Directive #label
  *
  * @private
  * @param {!FileStructure} file - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._label = function _label(file, value) {
		file.beginLabel(value);
	};

	/**
  * Directive #endlabel
  *
  * @private
  * @param {!FileStructure} file - a file structure
  */

	Parser.prototype._endlabel = function _endlabel(file) {
		file.endLabel();
	};

	/**
  * Directive #if
  *
  * @private
  * @param {!FileStructure} file - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._if = function _if(file, value) {
		if (!value.trim()) {
			throw new Error('Bad "if" directive');
		}

		var args = value.split(/\s+/);

		var res = true;
		if (args.length > 1 && args[0] === 'not') {
			res = false;
			args.shift();
		}

		file.beginIf(args[0], res);
	};

	/**
  * Directive #endif
  *
  * @private
  * @param {!FileStructure} file - a file structure
  */

	Parser.prototype._endif = function _endif(file) {
		file.endIf();
	};

	/**
  * Directive #set
  *
  * @private
  * @param {!FileStructure} file - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._set = function _set(file, value) {
		if (!value.trim()) {
			throw new Error('Bad "set" directive');
		}

		file.addSet(value.split(/\s+/)[0]);
	};

	/**
  * Directive #unset
  *
  * @private
  * @param {!FileStructure} file - a file structure
  * @param {string} value - a value of the directive
  */

	Parser.prototype._unset = function _unset(file, value) {
		if (!value.trim()) {
			throw new Error('Bad "unset" directive');
		}

		file.addUnset(value.split(/\s+/)[0]);
	};

	return Parser;
})();

exports['default'] = Parser;
module.exports = exports['default'];