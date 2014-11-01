var Parser = require('./build/parser');

/** @type {!Array} */
exports.VERSION = [1, 0, 6];

/**
 * Обработать указанный файл
 *
 * @param {string} file - адрес файла
 * @param {Object} [params] - дополнительные параметры операции
 * @param {Object=} [params.flags] - таблица заданных флагов
 * @param {Object=} [params.labels] - таблица заданных меток
 * @param {?string=} [params.content] - текст файла
 * @param {?string=} [params.lineSeparator] - символ перевода строки
 * @param {Array=} [params.replacers] - массив функций трансформации
 * @param {function(Error, string=, string=)} callback - функция обратного вызова
 */
exports.compile = function (file, params, callback) {
	params = params || /* istanbul ignore next */ {};
	params.flags = params.flags || {};
	params.labels = params.labels || {};
	params.lineSeparator = params.lineSeparator || /* istanbul ignore next */ '\n';
	params.replacers = params.replacers || /* istanbul ignore next */ [];

	function finish(err, fileStructure, path) {
		/* istanbul ignore if */
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
			/* istanbul ignore if */
			if (err) {
				return callback(err);
			}

			parser.parse(file, String(params.content), finish);
		})

	} else {
		parser.parseFile(file, finish);
	}
};
