module.exports = FileStructure;
var path = require('path');

/**
 * Объект структуры файла
 *
 * @constructor
 * @param {string} src - путь к файлу
 * @param {string} lineSeparator - символ перевода строки
 */
function FileStructure(src, lineSeparator) {
	this.fname = src;
	this.nl = lineSeparator;

	this.root = {
		type: 'root',
		content: [],
		labels: {}
	};

	this.currentBlock = this.root;
	this.included = {};
}

/**
 * Вернуть адрес указанного файла относительно базовой папки
 *
 * @param {string} src - путь к файлу
 * @return {string}
 */
FileStructure.prototype.getRelativePathOf = function (src) {
	return path.normalize(path.resolve(path.dirname(this.fname), src));
};

/**
 * Добавить произвольный JavaScript в структуру файла
 *
 * @param {string} code - добавляемый код
 * @return {!FileStructure}
 */
FileStructure.prototype.addCode = function (code) {
	this.currentBlock.content.push({
		type: 'code',
		code: code,
		included: false
	});

	return this;
};

/**
 * Добавить другой файл в структуру файла
 *
 * @param {!FileStructure} fileStructure - структура добавляемого файла
 * @param {!Object} labels - таблица заданных меток
 * @return {!FileStructure}
 */
FileStructure.prototype.addInclude = function (fileStructure, labels) {
	this.currentBlock.content.push({
		type: 'include',
		fileStructure: fileStructure,
		labels: labels
	});

	return this;
};

/**
 * Добавить исключение файла в структуру файла
 *
 * @param {!FileStructure} fileStructure - структура добавляемого файла
 * @param {!Object} labels - таблица заданных меток
 * @return {!FileStructure}
 */
FileStructure.prototype.addWithout = function (fileStructure, labels) {
	this.currentBlock.content.push({
		type: 'without',
		fileStructure: fileStructure,
		labels: labels
	});

	return this;
};

/**
 * Установить флаг
 *
 * @param {string} flag - название флага
 * @return {!FileStructure}
 */
FileStructure.prototype.addSet = function (flag) {
	this.currentBlock.content.push({
		type: 'set',
		varName: flag,
		value: true
	});

	return this;
};

/**
 * Отменить флаг
 *
 * @param {string} flag - название флага
 * @return {!FileStructure}
 */
FileStructure.prototype.addUnset = function (flag) {
	this.currentBlock.content.push({
		type: 'set',
		varName: flag,
		value: false
	});

	return this;
};

/**
 * Установить условие
 *
 * @param {string} flag - название флага
 * @param {boolean} value - значение флага
 * @return {!FileStructure}
 */
FileStructure.prototype.beginIf = function (flag, value) {
	var ifBlock = {
		parent: this.currentBlock,
		type: 'if',
		varName: flag,
		value: value,
		content: []
	};

	this.currentBlock.content.push(ifBlock);
	this.currentBlock = ifBlock;

	return this;
};

/**
 * Закончить условие
 * @return {!FileStructure}
 */
FileStructure.prototype.endIf = function () {
	if (this.currentBlock.type != 'if') {
		throw new Error('Attempt to close an unopened block "#if"');
	}

	this.currentBlock = this.currentBlock.parent;
	return this;
};

/**
 * Установить метку
 *
 * @param {string} label - название метки
 * @return {!FileStructure}
 */
FileStructure.prototype.beginLabel = function (label) {
	var labelBlock = {
		parent: this.currentBlock,
		type: 'label',
		label: label,
		content: []
	};

	this.currentBlock.content.push(labelBlock);
	this.currentBlock = labelBlock;

	return this;
};

/**
 * Закончить метку
 * @return {!FileStructure}
 */
FileStructure.prototype.endLabel = function () {
	if (this.currentBlock.type !== 'label') {
		throw new Error('Attempt to close an unopened block "#label"');
	}

	this.currentBlock = this.currentBlock.parent;
	return this;
};

/**
 * Добавить ошибку в структуру файла
 *
 * @param {string} msg - текст ошибки
 * @return {!FileStructure}
 */
FileStructure.prototype.error = function (msg) {
	this.addCode((("throw new Error(" + (JSON.stringify(("Monic error: " + msg)))) + (");" + (this.nl)) + ""));
	return this;
};

/**
 * Компилировать структуру файла
 *
 * @param {Array=} [opt_labels] - таблица заданных меток
 * @param {Object=} [opt_flags] - таблица заданных флагов
 * @return {string}
 */
FileStructure.prototype.compile = function (opt_labels, opt_flags) {
	if (opt_labels) {
		for (var key in opt_labels) {
			if (!opt_labels.hasOwnProperty(key)) {
				continue;
			}

			this.root.labels[key] = true;
		}
	}

	return this._compileBlock(this.root, this.root.labels, opt_flags || {});
};

/**
 * Компилировать исключение файла
 *
 * @param {Array=} [opt_labels] - таблица заданных меток
 * @param {Object=} [opt_flags] - таблица заданных флагов
 * @return {!FileStructure}
 */
FileStructure.prototype.without = function (opt_labels, opt_flags) {
	this._compileBlock(this.root, opt_labels || {}, opt_flags || {});
	return this;
};

/**
 * Компилировать структуру файла
 *
 * @private
 * @param {Object} block - объект структуры файла
 * @param {!Object} labels - таблица заданных меток
 * @param {!Object} flags - таблица заданных флагов
 * @return {string}
 */
FileStructure.prototype._compileBlock = function (block, labels, flags) {var this$0 = this;
	switch (block.type) {
		case 'code':
			if (!block.included) {
				block.included = true;
				return block.code;
			}

			break;

		case 'include':
			var cacheKey = block.fileStructure.fname +
				'@' + Object.keys(block.labels).sort() +
				'@' + Object.keys(flags).sort();

			for (var key in labels) {
				if (!labels.hasOwnProperty(key)) {
					continue;
				}

				block.labels[key] = true;
			}

			if (!this.included[cacheKey]) {
				this.included[cacheKey] = true;
				return block.fileStructure.compile(block.labels, flags);
			}

			break;

		case 'without':
			block.fileStructure.without(block.labels, flags);
			break;

		case 'set':
			flags[block.varName] = block.value;
			break;

		default:
			if (this._isValidContentBlock(block, labels, flags)) {
				return block.content
					.map(function(block)  {return this$0._compileBlock(block, labels, flags)})
					.join('');
			}
	}

	return '';
};

/**
 * Вернуть true, если заданный объект структуры файла валидный
 *
 * @private
 * @param {Object} block - объект структуры файла
 * @param {!Object} labels - таблица заданных меток
 * @param {!Object} flags - таблица заданных флагов
 * @return {boolean}
 */
FileStructure.prototype._isValidContentBlock = function (block, labels, flags) {
	switch (block.type) {
		case 'root':
			return true;

		case 'if':
			return Boolean(flags[block.varName]) === Boolean(block.value);

		case 'label':
			return Boolean(!Object.keys(labels).length || labels[block.label]);
	}

	return false;
};
