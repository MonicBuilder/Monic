module.exports = MonicError;

/* istanbul ignore next */

/**
 * Объект ошибки Monic
 *
 * @constructor
 * @param {string} msg - текст ошибки
 * @param {string} file - адрес файла, в котором произошла ошибка
 * @param {number} line - номер строки, на которой произошла ошибка
 */
function MonicError(msg, file, line) {
	this.message = msg;
	this.file = file;
	this.line = line;
}

/* istanbul ignore next */

/**
 * Преобразовать объект ошибки в строку
 * @return {string}
 */
MonicError.prototype.toString = function () {
	return `Error: ${this.message} (${this.file}: ${this.line})`;
};
