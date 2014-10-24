module.exports = FileBuilderError;

/**
 * Ошибка FileBuilder
 *
 * @constructor
 * @param {string} msg - сообщение ошибки
 * @param {string} file - адрес файла, в котором произошла ошибка
 * @param {number} line - номер строки, на которой произошла ошибка
 */
function FileBuilderError(msg, file, line) {
	this.message = msg;
	this.file = file;
	this.line = line;
}

/**
 * Преобразовать объект ошибки в строку
 * @return {string}
 */
FileBuilderError.prototype.toString = function() {
	return 'Error: ' + this.message + ' (' + this.file + ':' + this.line + ')';
};