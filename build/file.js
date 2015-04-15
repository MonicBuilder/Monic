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

var _$C = require('collection.js');

/**
 * File structure class
 */

var FileStructure = (function () {
	/**
  * @param {string} src - a path to a file
  * @param {string} lineSeparator - EOL symbol
  */

	function FileStructure(src, lineSeparator) {
		_classCallCheck(this, FileStructure);

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
  * Returns a file path relative to the base folder
  *
  * @param {string} src - the file path
  * @return {string}
  */

	FileStructure.prototype.getRelativePathOf = function getRelativePathOf(src) {
		return _path2['default'].normalize(_path2['default'].resolve(_path2['default'].dirname(this.fname), src));
	};

	/**
  * Adds custom JavaScript to the structure
  *
  * @param {string} code - some JavaScript code
  * @return {!FileStructure}
  */

	FileStructure.prototype.addCode = function addCode(code) {
		this.currentBlock.content.push({
			type: 'code',
			code: code,
			included: false
		});

		return this;
	};

	/**
  * Adds a file to the structure
  *
  * @param {!FileStructure} fileStructure - the structure of the adding file
  * @param {!Object} labels - a map of labels
  * @return {!FileStructure}
  */

	FileStructure.prototype.addInclude = function addInclude(fileStructure, labels) {
		this.currentBlock.content.push({
			type: 'include',
			fileStructure: fileStructure,
			labels: labels
		});

		return this;
	};

	/**
  * Adds expulsion to the structure
  *
  * @param {!FileStructure} fileStructure - the structure of the expulsion file
  * @param {!Object} labels - a map of labels
  * @return {!FileStructure}
  */

	FileStructure.prototype.addWithout = function addWithout(fileStructure, labels) {
		this.currentBlock.content.push({
			type: 'without',
			fileStructure: fileStructure,
			labels: labels
		});

		return this;
	};

	/**
  * Sets a flag
  *
  * @param {string} flag - the flag name
  * @return {!FileStructure}
  */

	FileStructure.prototype.addSet = function addSet(flag) {
		this.currentBlock.content.push({
			type: 'set',
			varName: flag,
			value: true
		});

		return this;
	};

	/**
  * Cancels a flag
  *
  * @param {string} flag - the flag name
  * @return {!FileStructure}
  */

	FileStructure.prototype.addUnset = function addUnset(flag) {
		this.currentBlock.content.push({
			type: 'set',
			varName: flag,
			value: false
		});

		return this;
	};

	/**
  * Sets a condition
  *
  * @param {string} flag - the condition
  * @param {boolean} value - a value of the condition
  * @return {!FileStructure}
  */

	FileStructure.prototype.beginIf = function beginIf(flag, value) {
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
  * Ends a condition
  * @return {!FileStructure}
  */

	FileStructure.prototype.endIf = function endIf() {
		if (this.currentBlock.type != 'if') {
			throw new Error('Attempt to close an unopened block "#if"');
		}

		this.currentBlock = this.currentBlock.parent;
		return this;
	};

	/**
  * Sets a label
  *
  * @param {string} label - the label name
  * @return {!FileStructure}
  */

	FileStructure.prototype.beginLabel = function beginLabel(label) {
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
  * Ends a label
  * @return {!FileStructure}
  */

	FileStructure.prototype.endLabel = function endLabel() {
		if (this.currentBlock.type !== 'label') {
			throw new Error('Attempt to close an unopened block "#label"');
		}

		this.currentBlock = this.currentBlock.parent;
		return this;
	};

	/**
  * Adds an error to the structure
  *
  * @param {string} msg - the error text
  * @return {!FileStructure}
  */

	FileStructure.prototype.error = function error(msg) {
		this.addCode('throw new Error(' + JSON.stringify('Monic error: ' + msg) + ');' + this.nl);
		return this;
	};

	/**
  * Compiles the structure
  *
  * @param {Array=} [opt_labels] - a map of labels
  * @param {Object=} [opt_flags] - a map of flags
  * @return {string}
  */

	FileStructure.prototype.compile = function compile(opt_labels, opt_flags) {
		var _this = this;

		_$C.$C(opt_labels).forEach(function (el, key) {
			_this.root.labels[key] = true;
		});

		return this._compileBlock(this.root, this.root.labels, opt_flags || {});
	};

	/**
  * Compiles expulsion of a file
  *
  * @param {Array=} [opt_labels] - a map of labels
  * @param {Object=} [opt_flags] - a map of flags
  * @return {!FileStructure}
  */

	FileStructure.prototype.without = function without(opt_labels, opt_flags) {
		this._compileBlock(this.root, opt_labels || {}, opt_flags || {});
		return this;
	};

	/**
  * Compiles some file structure
  *
  * @private
  * @param {!Object} block - the structure object
  * @param {!Object} labels - a map of labels
  * @param {!Object} flags - a map of flags
  * @return {string}
  */

	FileStructure.prototype._compileBlock = function _compileBlock(block, labels, flags) {
		var _this2 = this;

		switch (block.type) {
			case 'code':
				if (!block.included) {
					block.included = true;
					return block.code;
				}

				break;

			case 'include':
				var cacheKey = block.fileStructure.fname + '@' + Object.keys(block.labels).sort() + '@' + Object.keys(flags).sort();

				_$C.$C(labels).forEach(function (el, key) {
					block.labels[key] = true;
				});

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
				if (FileStructure.isValidContentBlock(block, labels, flags)) {
					return block.content.map(function (block) {
						return _this2._compileBlock(block, labels, flags);
					}).join('');
				}
		}

		return '';
	};

	/**
  * Returns true if an object is valid file structure
  *
  * @param {!Object} block - the structure object
  * @param {!Object} labels - a map of labels
  * @param {!Object} flags - a map of flags
  * @return {boolean}
  */

	FileStructure.isValidContentBlock = function isValidContentBlock(block, labels, flags) {
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

	return FileStructure;
})();

exports.FileStructure = FileStructure;