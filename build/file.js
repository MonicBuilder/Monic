/*!
 * Monic v2.1.12
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Sun, 24 May 2015 13:57:30 GMT
 */

// istanbul ignore next
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

// istanbul ignore next

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

exports.__esModule = true;

var _uid = require('uid');

var _uid2 = _interopRequireDefault(_uid);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Parser = require('./parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _$C = require('collection.js');

/**
 * File structure class
 */

var FileStructure = (function () {
	/**
  * @param {string} file - a path to a file
  * @param {string} eol - EOL symbol
  */

	function FileStructure(_ref) {
		var file = _ref.file;
		var eol = _ref.eol;

		_classCallCheck(this, FileStructure);

		this.file = file;
		this.eol = eol;

		this.root = {
			type: 'root',
			content: [],
			labels: {}
		};

		this.uid = _uid2['default']();
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
		return _Parser2['default'].normalizePath(_path2['default'].resolve(_path2['default'].dirname(this.file), src));
	};

	/**
  * Adds custom code (text) to the structure
  *
  * @param {string} code - some code
  * @param {Object=} [opt_info] - an information object for a source map
  * @return {!FileStructure}
  */

	FileStructure.prototype.addCode = function addCode(code, opt_info) {
		this.currentBlock.content.push({
			type: 'code',
			included: false,
			info: opt_info,
			code: code
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
			content: [],
			varName: flag,
			value: value
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
			throw new SyntaxError('Attempt to close an unopened block "#if"');
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
			content: [],
			label: label
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
			throw new SyntaxError('Attempt to close an unopened block "#label"');
		}

		this.currentBlock = this.currentBlock.parent;
		return this;
	};

	/**
  * Compiles the structure
  *
  * @param {Array=} [opt_labels] - a map of labels
  * @param {Object=} [opt_flags] - a map of flags
  * @param {SourceMapGenerator=} [opt_sourceMap] - a source map object
  * @return {string}
  */

	FileStructure.prototype.compile = function compile(opt_labels, opt_flags, opt_sourceMap) {
		var _this = this;

		_$C.$C(opt_labels).forEach(function (el, key) {
			_this.root.labels[key] = true;
		});

		return this._compileBlock(this.root, this.root.labels, opt_flags || {}, opt_sourceMap);
	};

	/**
  * Compiles expulsion of a file
  *
  * @param {Array=} [opt_labels] - a map of labels
  * @param {Object=} [opt_flags] - a map of flags
  * @param {SourceMapGenerator=} [opt_sourceMap] - a source map object
  * @return {!FileStructure}
  */

	FileStructure.prototype.without = function without(opt_labels, opt_flags, opt_sourceMap) {
		this._compileBlock(this.root, opt_labels || {}, opt_flags || {}, opt_sourceMap);
		return this;
	};

	/**
  * Compiles some file structure
  *
  * @private
  * @param {!Object} block - the structure object
  * @param {!Object} labels - a map of labels
  * @param {!Object} flags - a map of flags
  * @param {SourceMapGenerator=} [opt_sourceMap] - a source map object
  * @return {string}
  */

	FileStructure.prototype._compileBlock = function _compileBlock(block, labels, flags, opt_sourceMap) {
		var _this2 = this;

		switch (block.type) {
			case 'code':
				if (!block.included) {
					block.included = true;
					return block.code;
				}

				break;

			case 'include':
				var cacheKey = block.fileStructure.file + '@' + Object.keys(block.labels).sort() + '@' + Object.keys(flags).sort();

				_$C.$C(labels).forEach(function (el, key) {
					block.labels[key] = true;
				});

				if (!this.included[cacheKey]) {
					this.included[cacheKey] = true;
					return block.fileStructure.compile(block.labels, flags, opt_sourceMap);
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
					return _$C.$C(block.content).map(function (block) {
						if (!_Parser2['default'].current || _this2.uid !== _Parser2['default'].current) {
							_Parser2['default'].current = _this2.uid;
						}

						var info = block.info;

						var compiledBlock = _this2._compileBlock(block, labels, flags, opt_sourceMap);

						if (opt_sourceMap && info && compiledBlock) {
							if (!info.ignore) {
								(function () {
									var test = {},
									    selfMap = info.source;

									_$C.$C(selfMap ? [info] : info).forEach(function (info) {
										if (selfMap) {
											info.generated.line = _Parser2['default'].cursor;
										} else {
											info.generated.line += _Parser2['default'].cursor - info.generated.line;
										}

										opt_sourceMap.addMapping(info);

										if (!test[info.source]) {
											test[info.source] = true;
											opt_sourceMap.setSourceContent(info.source, info.sourcesContent);
										}
									});
								})();
							}

							_Parser2['default'].cursor++;
						}

						return compiledBlock;
					}).join('');
				}
		}

		return '';
	};

	/**
  * Returns true if an object is a valid file structure
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