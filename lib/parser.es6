module.exports = Parser;

var FileStructure = require('./file');
var BuilderError = require('./error');

var fs = require('fs');
var async = require('async');

/**
 * Объект парсера файла
 * @constructor
 */
function Parser() {
	this._cache = {};
	this._realpathCache = {};
}

/**
 * Проверить существование указанного файла
 * и вернуть абсолютный путь к нему
 *
 * @param {string} file - адрес файла
 * @param {function(Error, string=)} callback - функция обратного вызова
 */
Parser.prototype.normalizePath = function (file, callback) {
	if (this._realpathCache[file]) {
		callback(null, this._realpathCache[file]);

	} else {
		async.waterfall([
			(callback) => {
				fs.exists(file, (exists) => { callback(null, exists); });
			},

			(exists, callback) => {
				if (!exists) {
					return callback(new Error('File ' + file + ' not found'));
				}

				fs.realpath(file, callback);
			},

			(path, callback) => {
				fs.stat(file, (err, stat) => {
					callback(err, stat, path.replace(/\\/g, '/'));
				});
			},

			(stat, path, callback) => {
				if (!stat.isFile()) {
					return callback(new Error('File ' + file + ' not found'));
				}

				this._realpathCache[file] = path;
				callback(null, path);
			}

		], callback);
	}
};

/**
 * Провести парсинг указанного файла
 * и вернуть его структуру
 *
 * @param {string} file - адрес файла
 * @param {function(Error, FileStructure=, string=)} callback - функция обратного вызова
 */
Parser.prototype.parseFile = function (file, callback) {
	this.normalizePath(file, (err, path) => {
		if (err) {
			return callback(err);
		}

		if (this._cache[path]) {
			return callback(null, this._cache[path], path);
		}

		fs.readFile(path, 'utf8', (err, content) => {
			if (err) {
				return callback(err);
			}

			this.parse(path, content, callback);
		});
	});
};

/**
 * Провести парсинг заданного текста
 * и вернуть его структуру
 *
 * @param {string} file - адрес файла
 * @param {string} content - содержимое файла
 * @param {function(Error, FileStructure=, string=)} callback - функция обратного вызова
 */
Parser.prototype.parse = function (file, content, callback) {
	if (this._cache[file]) {
		return callback(null, this._cache[file], file);
	}

	// Поддержка import в CSS
	content = content.replace(/@import url\(("|')(.*?)\1\);/gim, '//#include $2');

	// Поддержка require
	content = content.replace(/require\('(.*?)'\);/gim, '//#include $1');

	var fileStructure = new FileStructure(file);
	this._cache[file] = fileStructure;

	var lines = content.split(/\r?\n/);

	var parseLines = (start) => {
		var i;
		var errors = [];

		var appendError = (err) => {
			var msg = err.message;
			var line = i + 1;

			errors.push(new BuilderError(msg, file, line));
			fileStructure.error(msg);
		};

		var asyncParseCallback = (err) => {
			if (err) {
				appendError(err);
			}

			parseLines(i + 1);
		};

		for (i = start; i < lines.length; i++) {
			let line = lines[i];

			if (line.match(/^\s*\/\/#([\s\S]*)$/)) {
				if (RegExp.$1) {
					let command = RegExp.$1.split(' ');
					let directive = command.shift();
					let params = command.join(' ');

					if (/^(include|without)$/.test(directive)) {
						return this['_' + directive](fileStructure, params, asyncParseCallback);

					} else if (/^(label|endlabel|if|endif|set|unset)$/.test(directive)) {
						try {
							this['_' + directive](fileStructure, params);

						} catch (err) {
							appendError(err);
						}

					} else {
						appendError(new Error('Unknown directive ' + directive));
					}
				}

			} else {
				fileStructure.addCode(line + (i < lines.length - 1 ? '\n' : ''));
			}
		}

		callback(null, fileStructure, file);
	};

	parseLines(0);
};

/**
 * Директива #include
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} params - параметры директивы
 * @param {function(Error=)} callback - функция обратного вызова
 */
Parser.prototype._include = function (file, params, callback) {
	var paramsParts = params.split('::');
	var includeFileName = paramsParts.shift();

	if (includeFileName) {
		let path = file.getRelativePathOf(includeFileName);
		this.parseFile(path, (err, includeFile) => {
			if (err) {
				callback(err);
				return;
			}

			file.addInclude(includeFile, paramsParts);
			callback();
		});

	} else {
		try {
			file.addInclude(file, paramsParts);
			callback();

		} catch (err) {
			callback(err);
		}
	}
};

/**
 * Директива #without
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 * @param {function(Error=)} callback - функция обратного вызова
 */
Parser.prototype._without = function (file, value, callback) {
	var paramsParts = value.split('::');
	var includeFname = file.getRelativePathOf(paramsParts.shift());

	this.parseFile(includeFname, (err, includeFile) => {
		if (err) {
			return callback(err);
		}

		file.addWithout(includeFile, paramsParts);
		callback();
	});
};

/**
 * Директива #label
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._label = function (file, value) {
	file.beginLabel(value);
};

/**
 * Директива #endlabel
 * @param {!FileStructure} file - структура файла
 */
Parser.prototype._endlabel = function (file) {
	file.endLabel();
};

/**
 * Директива #if
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._if = function (file, value) {
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
 * Директива #endif
 * @param {!FileStructure} file - структура файла
 */
Parser.prototype._endif = function (file) {
	file.endIf();
};

/**
 * Директива #set
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._set = function (file, value) {
	if (!value.trim()) {
		throw new Error('Bad set directive');
	}

	file.addSet(value.split(/\s+/)[0]);
};

/**
 * Директива #unset
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._unset = function (file, value) {
	if (!value.trim()) {
		throw new Error('Bad unset directive');
	}

	file.addUnset(value.split(/\s+/)[0]);
};