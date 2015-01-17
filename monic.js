var Parser = require('./build/parser');

/** @type {!Array} */
exports.VERSION = [1, 1, 8];

/**
 * Обработать указанный файл
 *
 * @param {string} file - адрес файла
 * @param {{
 *     flags: (Object|undefined),
 *     labels: (Object|undefined),
 *     content: (?string|undefined),
 *     lineSeparator: (?string|undefined),
 *     replacers: (Array|undefined)
 * }} [params] - дополнительные параметры операции:
 *     *) [params.flags] - таблица заданных флагов
 *     *) [params.labels] - таблица заданных меток
 *     *) [params.content] - текст файла
 *     *) [params.lineSeparator] - символ перевода строки
 *     *) [params.replacers] - массив функций трансформации
 *
 * @param {function(Error, string=, string=)} callback - функция обратного вызова
 */
exports.compile = function (file, params, callback) {
	params = params || {};
	params.flags = params.flags || {};
	params.labels = params.labels || {};
	params.lineSeparator = params.lineSeparator || '\n';
	params.replacers = params.replacers || [];

	function finish(err, fileStructure, path) {
		if (err) {
			return callback(err);
		}

		callback(null, fileStructure.compile(params.labels, params.flags), path);
	}

	var p = {
		lineSeparator: params.lineSeparator,
		replacers: params.replacers
	};

	var parser = new Parser(p);

	if (params.content != null) {
		parser.normalizePath(file, function (err, file) {
			if (err) {
				return callback(err);
			}

			parser.parse(file, String(params.content), finish);
		});

	} else {
		parser.parseFile(file, finish);
	}
};
