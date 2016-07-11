/*!
 * Monic v2.3.14
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Mon, 11 Jul 2016 11:18:55 GMT
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.FileStructure = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var uid = require('uid'),
    path = require('path');

var $C = require('collection.js/compiled');

/**
 * File structure class
 */

var FileStructure = exports.FileStructure = function () {
	/**
  * @param {string} file - file path
  * @param {!Object} globals - map of global Monic flags
  */

	function FileStructure(_ref) {
		var file = _ref.file;
		var globals = _ref.globals;

		_classCallCheck(this, FileStructure);

		this.file = file;
		this.root = {
			type: 'root',
			content: [],
			labels: {}
		};

		this.uid = uid();
		this.currentBlock = this.root;
		this.included = {};
		this.globals = globals;
	}

	/**
  * Returns a file path relative to the base folder
  *
  * @param {string} src - file path
  * @return {string}
  */


	_createClass(FileStructure, [{
		key: 'getRelativePathOf',
		value: function getRelativePathOf(src) {
			return _parser2.default.normalizePath(path.resolve(path.dirname(this.file), src));
		}

		/**
   * Adds custom code (text) to the structure
   *
   * @param {string} code - some code
   * @param {Object=} [opt_info] - information object for a source map
   * @return {!FileStructure}
   */

	}, {
		key: 'addCode',
		value: function addCode(code, opt_info) {
			this.currentBlock.content.push({
				type: 'code',
				included: false,
				info: opt_info,
				code: code
			});

			return this;
		}

		/**
   * Adds a file to the structure
   *
   * @param {!FileStructure} fileStructure - structure of the adding file
   * @param {!Object} labels - map of Monic labels
   * @return {!FileStructure}
   */

	}, {
		key: 'addInclude',
		value: function addInclude(fileStructure, labels) {
			this.currentBlock.content.push({
				type: 'include',
				fileStructure: fileStructure,
				labels: labels
			});

			return this;
		}

		/**
   * Adds expulsion to the structure
   *
   * @param {!FileStructure} fileStructure - structure of the expulsion file
   * @param {!Object} labels - map of Monic labels
   * @return {!FileStructure}
   */

	}, {
		key: 'addWithout',
		value: function addWithout(fileStructure, labels) {
			this.currentBlock.content.push({
				type: 'without',
				fileStructure: fileStructure,
				labels: labels
			});

			return this;
		}

		/**
   * Sets a flag
   *
   * @param {string} flag - flag name
   * @param {boolean=} [opt_value] - flag value
   * @return {!FileStructure}
   */

	}, {
		key: 'addSet',
		value: function addSet(flag) {
			var opt_value = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

			if (this.currentBlock.type === 'root') {
				this.globals[flag] = opt_value;
			}

			this.currentBlock.content.push({
				type: 'set',
				varName: flag,
				value: opt_value
			});

			return this;
		}

		/**
   * Cancels a flag
   *
   * @param {string} flag - flag name
   * @return {!FileStructure}
   */

	}, {
		key: 'addUnset',
		value: function addUnset(flag) {
			if (this.currentBlock.type === 'root') {
				delete this.globals[flag];
			}

			this.currentBlock.content.push({
				type: 'set',
				varName: flag,
				value: false
			});

			return this;
		}

		/**
   * Sets a condition
   *
   * @param {string} flag - condition
   * @param {string} type - condition type
   * @param {(boolean|string)=} [opt_value] - condition value
   * @param {boolean=} [opt_unless] - unless mode
   * @return {!FileStructure}
   */

	}, {
		key: 'beginIf',
		value: function beginIf(flag, type) {
			var opt_value = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];
			var opt_unless = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

			var aliases = {
				'=': 'eq',
				'!=': 'ne',
				'>': 'gt',
				'>=': 'gte',
				'<': 'lt',
				'<=': 'lte'
			};

			var ifBlock = {
				parent: this.currentBlock,
				type: aliases[type] || type,
				content: [],
				varName: flag,
				value: opt_value,
				unless: opt_unless
			};

			this.currentBlock.content.push(ifBlock);
			this.currentBlock = ifBlock;

			return this;
		}

		/**
   * Ends a condition
   * @return {!FileStructure}
   */

	}, {
		key: 'endIf',
		value: function endIf() {
			if (!{ eq: true, ne: true, gt: true, gte: true, lt: true, lte: true }[this.currentBlock.type]) {
				throw new SyntaxError('Attempt to close an unopened block "#' + (this.currentBlock.unless ? 'unless' : 'if') + '"');
			}

			this.currentBlock = this.currentBlock.parent;
			return this;
		}

		/**
   * Sets a label
   *
   * @param {string} label - label name
   * @return {!FileStructure}
   */

	}, {
		key: 'beginLabel',
		value: function beginLabel(label) {
			var labelBlock = {
				parent: this.currentBlock,
				type: 'label',
				content: [],
				label: label
			};

			this.currentBlock.content.push(labelBlock);
			this.currentBlock = labelBlock;

			return this;
		}

		/**
   * Ends a label
   * @return {!FileStructure}
   */

	}, {
		key: 'endLabel',
		value: function endLabel() {
			if (this.currentBlock.type !== 'label') {
				throw new SyntaxError('Attempt to close an unopened block "#label"');
			}

			this.currentBlock = this.currentBlock.parent;
			return this;
		}

		/**
   * Compiles the structure
   *
   * @param {Array=} [opt_labels] - map of Monic labels
   * @param {Object=} [opt_flags] - map of Monic flags
   * @param {SourceMapGenerator=} [opt_sourceMap] - source map object
   * @return {string}
   */

	}, {
		key: 'compile',
		value: function compile(opt_labels, opt_flags, opt_sourceMap) {
			var _this = this;

			$C(opt_labels).forEach(function (el, key) {
				return _this.root.labels[key] = true;
			});
			return this._compileBlock(this.root, this.root.labels, opt_flags || {}, opt_sourceMap);
		}

		/**
   * Compiles expulsion of a file
   *
   * @param {Array=} [opt_labels] - a map of Monic labels
   * @param {Object=} [opt_flags] - map of Monic flags
   * @param {SourceMapGenerator=} [opt_sourceMap] - source map object
   * @return {!FileStructure}
   */

	}, {
		key: 'without',
		value: function without(opt_labels, opt_flags, opt_sourceMap) {
			this._compileBlock(this.root, opt_labels || {}, opt_flags || {}, opt_sourceMap);
			return this;
		}

		/**
   * Compiles some file structure
   *
   * @private
   * @param {!Object} block - structure object
   * @param {!Object} labels - map of Monic labels
   * @param {!Object} flags - map of Monic flags
   * @param {SourceMapGenerator=} [opt_sourceMap] - source map object
   * @return {string}
   */

	}, {
		key: '_compileBlock',
		value: function _compileBlock(block, labels, flags, opt_sourceMap) {
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

					$C(labels).forEach(function (el, key) {
						return block.labels[key] = true;
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
						return $C(block.content).map(function (block) {
							if (!_parser2.default.current || _this2.uid !== _parser2.default.current) {
								_parser2.default.current = _this2.uid;
							}

							var info = block.info;


							var compiledBlock = _this2._compileBlock(block, labels, flags, opt_sourceMap);

							if (opt_sourceMap && info && compiledBlock) {
								if (!info.ignore) {
									(function () {
										var test = {},
										    selfMap = info.source;

										$C(selfMap ? [info] : info).forEach(function (info) {
											if (selfMap) {
												info.generated.line = _parser2.default.cursor;
											} else {
												info.generated.line += _parser2.default.cursor - info.generated.line;
											}

											opt_sourceMap.addMapping(info);

											if (!test[info.source]) {
												test[info.source] = true;
												opt_sourceMap.setSourceContent(info.source, info.sourcesContent);
											}
										});
									})();
								}

								_parser2.default.cursor++;
							}

							return compiledBlock;
						}).join('');
					}
			}

			return '';
		}

		/**
   * Returns true if an object is a valid file structure
   *
   * @param {!Object} block - structure object
   * @param {!Object} labels - map of Monic labels
   * @param {!Object} flags - map of Monic flags
   * @return {boolean}
   */

	}], [{
		key: 'isValidContentBlock',
		value: function isValidContentBlock(block, labels, flags) {
			var res = void 0;
			switch (block.type) {
				case 'root':
					return true;

				case 'label':
					return Boolean(!Object.keys(labels).length || labels[block.label]);

				case 'eq':
					res = flags[block.varName] === block.value;
					break;

				case 'ne':
					res = flags[block.varName] !== block.value;
					break;

				case 'gt':
					res = Number(flags[block.varName]) > Number(block.value);
					break;

				case 'gte':
					res = Number(flags[block.varName]) >= Number(block.value);
					break;

				case 'lt':
					res = Number(flags[block.varName]) < Number(block.value);
					break;

				case 'lte':
					res = Number(flags[block.varName]) <= Number(block.value);
					break;
			}

			if (block.unless) {
				res = !res;
			}

			return res || false;
		}
	}]);

	return FileStructure;
}();
