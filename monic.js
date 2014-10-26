var Parser = require('./build/parser');

/** @type {!Array} */
exports.VERSION = [1, 0, 0];

/**
 * Компилировать указанный файл
 *
 * @param {string} file - адрес файла
 * @param {?string} [content] - содержимое файла
 * @param {Array} [labels] - массив меток
 * @param {Object} [flags] - таблица флагов
 * @param {function(Error, string=, string=)} callback - функция обратного вызова
 */
exports.compile = function(file, content, labels, flags, callback) {
	function finish(err, fileStructure, path) {
		if (err) {
			return callback(err);
		}

		callback(null, fileStructure.compile(labels, flags), path);
	}

	if (content) {
		new Parser().parse(file, content, finish);

	} else {
		new Parser().parseFile(file, finish);
	}
};
