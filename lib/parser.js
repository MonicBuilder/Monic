module.exports = Parser;

var FileStructure = require('./file'),
	MonicError = require('./error');

var fs = require('fs'),
	path = require('path');

var async = require('async'),
	glob = require('glob');

/**
 * Объект парсера файла
 *
 * @constructor
 * @param {!Object} params - дополнительные параметры операции
 * @param {string} params.lineSeparator - символ перевода строки
 * @param {!Array} params.replacers - массив функций трансформации
 */
function Parser(params) {
	this.nl = params.lineSeparator;
	this.replacers = params.replacers || [];
	this.realpathCache = {};
	this.cache = {};
}

/**
 * Проверить существование указанного файла
 * и вернуть абсолютный путь к нему
 *
 * @param {string} file - адрес файла
 * @param {function(Error, string=)} callback - функция обратного вызова
 */
Parser.prototype.normalizePath = function (file, callback) {
	file = path.normalize(path.resolve(file));

	if (this.realpathCache[file]) {
		callback(null, file);

	} else {
		async.waterfall([
			(callback) => {
				fs.exists(file, (exists) => {
					callback(null, exists);
				});
			},

			(exists, callback) => {
				if (!exists) {
					return callback(new Error(`File "${file}" not found`));
				}

				fs.stat(file, (err, stat) => {
					callback(err, stat);
				});
			},

			(stat, callback) => {
				if (!stat.isFile()) {
					return callback(new Error(`"${file}" is not a file`));
				}

				this.realpathCache[file] = true;
				callback(null, file);
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
	this.normalizePath(file, (err, src) => {
		if (err) {
			return callback(err);
		}

		if (this.cache[src]) {
			return callback(null, this.cache[src], src);
		}

		fs.readFile(src, 'utf8', (err, content) => {
			if (err) {
				return callback(err);
			}

			this.parse(src, content, callback);
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
	if (this.cache[file]) {
		return callback(null, this.cache[file], file);
	}

	var actions = [],
		dirname = path.dirname(file);

	// Обработка масок URL
	content = content.replace(/^(\s*\/\/(?:#include|without)\s+)(.*)/gm, (sstr, decl, src) => {
		if (/\*/.test(src)) {
			actions.push((callback) => {
				var parts = src.split('::');
				glob(path.join(dirname, parts[0]), null, (err, files) => {
					if (files) {
						content = content.replace(sstr, files.reduce((res, el) => {
							parts[0] = path.relative(dirname, el);
							res += decl + parts.join('::') + this.nl;
							return res;
						}, ''));
					}

					callback(err, files);
				});
			});
		}

		return sstr;
	});

	async.parallel(actions, (err) => {
		if (err) {
			return callback(err);
		}

		// Обработка перегрузок
		content = this.replacers.reduce((content, el) => {
			content = el(content);
			return content;

		}, content);

		var fileStructure = new FileStructure(file, this.nl),
			lines = content.split(/\r?\n|\r/);

		this.cache[file] = fileStructure;

		var parseLines = (start) => {
			var errors = [],
				i;

			function appendError(err) {
				var msg = err.message,
					line = i + 1;

				errors.push(new MonicError(msg, file, line));
				fileStructure.error(msg);
			}

			function asyncParseCallback(err) {
				if (err) {
					appendError(err);
				}

				parseLines(i + 1);
			}

			for (i = start; i < lines.length; i++) {
				let line = lines[i];

				if (line.match(/^\s*\/\/#(.*)/)) {
					if (RegExp.$1) {
						let command = RegExp.$1.split(' '),
							dir = String(command.shift());

						let key = '_' + dir,
							params = command.join(' ');

						if (/^(include|without)$/.test(dir)) {
							return this[key](fileStructure, params, asyncParseCallback);

						} else if (/^(label|endlabel|if|endif|set|unset)$/.test(dir)) {
							try {
								this[key](fileStructure, params);

							} catch (err) {
								appendError(err);
							}

						} else {
							appendError(new Error(`Unknown directive ${dir}`));
						}
					}

				} else {
					fileStructure.addCode(line + (i < lines.length - 1 ? this.nl : ''));
				}
			}

			callback(null, fileStructure, file);
		};

		parseLines(0);
	});
};

/**
 * Директива #include
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} params - параметры директивы
 * @param {function(Error=)} callback - функция обратного вызова
 */
Parser.prototype._include = function (file, params, callback) {
	var paramsParts = params.split('::'),
		includeFileName = paramsParts.shift();

	paramsParts = paramsParts.reduce((res, el) => {
		res[el] = true;
		return res;
	}, {});

	if (includeFileName) {
		let src = file.getRelativePathOf(includeFileName);
		this.parseFile(src, (err, includeFile) => {
			if (err) {
				return callback(err);
			}

			file.addInclude(includeFile, paramsParts);
			callback();
		});

	} else {
		for (let key in paramsParts) {
			if (!paramsParts.hasOwnProperty(key)) {
				continue;
			}

			file.root.labels[key] = true;
		}

		callback();
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
	var paramsParts = value.split('::'),
		includeFname = file.getRelativePathOf(paramsParts.shift());

	paramsParts = paramsParts.reduce((res, el) => {
		res[el] = true;
		return res;
	}, {});

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

	var args = value.split(/\s+/),
		res = true;

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
