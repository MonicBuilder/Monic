var Parser = require('./build/parser');

/** @type {!Array} */
exports.VERSION = [1, 0, 0];

/**
 * Обработать указанный файл
 *
 * @param {string} file - адрес файла
 * @param {Object} [params] - дополнительные параметры операции
 * @param {Array=} [params.flags] - массив заданных флагов
 * @param {Array=} [params.labels] - массив заданных меток
 * @param {?string=} [params.content] - текст файла
 * @param {?string=} [params.lineSeparator] - символ перевода строки
 * @param {Array=} [params.replacers] - массив функций трансформации
 * @param {function(Error, string=, string=)} callback - функция обратного вызова
 */
exports.compile = function(file, params, callback) {
	params = params || {};
	params.flags = params.flags || [];
	params.labels = params.labels || [];
	params.lineSeparator = params.lineSeparator || '\n';
	params.replacers = params.replacers || [];

	if (params.flags) {
		params.flags = params.flags.reduce(function (res, el, key) {
			res[key] = true;
			return res;
		}, {});
	}

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

	if (params.content) {
		new Parser(p).parse(file, params.content, finish);

	} else {
		new Parser(p).parseFile(file, finish);
	}
};
