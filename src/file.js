'use strict';

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

import Parser from './parser';

const
	$C = require('collection.js/compiled');

const
	uuid = require('uuid'),
	path = require('path');

/**
 * File structure class
 */
export class FileStructure {
	/**
	 * @param {string} file - file path
	 * @param {!Object} globals - map of global Monic flags
	 */
	constructor({file, globals}) {
		this.root = {
			type: 'root',
			content: [],
			labels: {}
		};

		this.file = file;
		this.uid = uuid();
		this.currentBlock = this.root;
		this.included = {};
		this.globals = globals;
	}

	/**
	 * Returns a file path relative to the base folder
	 *
	 * @param {string} src - file path
	 * @returns {string}
	 */
	getRelativePathOf(src) {
		return Parser.normalizePath(path.resolve(path.dirname(this.file), src));
	}

	/**
	 * Adds custom code (text) to the structure
	 *
	 * @param {string} code - some code
	 * @param {Object=} [opt_info] - information object for a source map
	 * @returns {!FileStructure}
	 */
	addCode(code, opt_info) {
		this.currentBlock.content.push({
			type: 'code',
			included: false,
			info: opt_info,
			code
		});

		return this;
	}

	/**
	 * Adds a file to the structure
	 *
	 * @param {!FileStructure} fileStructure - structure of the adding file
	 * @param {!Object} labels - map of Monic labels
	 * @returns {!FileStructure}
	 */
	addInclude(fileStructure, labels) {
		this.currentBlock.content.push({
			type: 'include',
			fileStructure,
			labels
		});

		return this;
	}

	/**
	 * Adds expulsion to the structure
	 *
	 * @param {!FileStructure} fileStructure - structure of the expulsion file
	 * @param {!Object} labels - map of Monic labels
	 * @returns {!FileStructure}
	 */
	addWithout(fileStructure, labels) {
		this.currentBlock.content.push({
			type: 'without',
			fileStructure,
			labels
		});

		return this;
	}

	/**
	 * Sets a flag
	 *
	 * @param {string} flag - flag name
	 * @param {?=} [opt_value] - flag value
	 * @returns {!FileStructure}
	 */
	addSet(flag, opt_value = true) {
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
	 * @returns {!FileStructure}
	 */
	addUnset(flag) {
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
	 * @param {?=} [opt_value] - condition value
	 * @param {boolean=} [opt_unless] - unless mode
	 * @returns {!FileStructure}
	 */
	beginIf(flag, type, opt_value = true, opt_unless = false) {
		const aliases = {
			'=': 'eq',
			'!=': 'ne',
			'>': 'gt',
			'>=': 'gte',
			'<': 'lt',
			'<=': 'lte'
		};

		const ifBlock = {
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
	 * @returns {!FileStructure}
	 */
	endIf() {
		const validIf = {
			is: true,
			eq: true,
			ne: true,
			gt: true,
			gte: true,
			lt: true,
			lte: true,
			has: true,
			call: true,
			callRight: true,
			like: true,
			instanceof: true,
			typeof: true
		};

		if (!validIf[this.currentBlock.type]) {
			throw new SyntaxError(`Attempt to close an unopened block "#${this.currentBlock.unless ? 'unless' : 'if'}"`);
		}

		this.currentBlock = this.currentBlock.parent;
		return this;
	}

	/**
	 * Sets a label
	 *
	 * @param {string} label - label name
	 * @returns {!FileStructure}
	 */
	beginLabel(label) {
		const labelBlock = {
			parent: this.currentBlock,
			type: 'label',
			content: [],
			label
		};

		this.currentBlock.content.push(labelBlock);
		this.currentBlock = labelBlock;

		return this;
	}

	/**
	 * Ends a label
	 * @returns {!FileStructure}
	 */
	endLabel() {
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
	 * @returns {string}
	 */
	compile(opt_labels, opt_flags, opt_sourceMap) {
		$C(opt_labels).forEach((el, key) => this.root.labels[key] = true);
		return this._compileBlock(this.root, this.root.labels, opt_flags || {}, opt_sourceMap);
	}

	/**
	 * Compiles expulsion of a file
	 *
	 * @param {Array=} [opt_labels] - a map of Monic labels
	 * @param {Object=} [opt_flags] - map of Monic flags
	 * @param {SourceMapGenerator=} [opt_sourceMap] - source map object
	 * @returns {!FileStructure}
	 */
	without(opt_labels, opt_flags, opt_sourceMap) {
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
	 * @returns {string}
	 */
	_compileBlock(block, labels, flags, opt_sourceMap) {
		switch (block.type) {
			case 'code':
				if (!block.included) {
					block.included = true;
					return block.code;
				}

				break;

			case 'include':
				const
					cacheKey = `${block.fileStructure.file}@${Object.keys(block.labels).sort()}@${Object.keys(flags).sort()}`;

				$C(labels).forEach((el, key) => {
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

			case 'set': {
				const
					store = $C(flags),
					path = block.varName,
					val = block.value;

				if (path.slice(-1) === '.') {
					const
						ctx = store.get(path.slice(0, -1));

					if (Array.isArray(ctx)) {
						ctx.push(val);

					} else {
						store.set(val, path.slice(-1));
					}

				} else {
					store.set(val, path);
				}

				break;
			}

			default:
				if (FileStructure.isValidContentBlock(block, labels, flags)) {
					return $C(block.content)
						.map((block) => {
							if (!Parser.current || this.uid !== Parser.current) {
								Parser.current = this.uid;
							}

							const
								{info} = block,
								compiledBlock = this._compileBlock(block, labels, flags, opt_sourceMap);

							if (opt_sourceMap && info && compiledBlock) {
								if (!info.ignore) {
									const
										test = {},
										selfMap = info.source;

									$C(selfMap ? [info] : info).forEach((info) => {
										if (selfMap) {
											info.generated.line = Parser.cursor;

										} else {
											info.generated.line += Parser.cursor - info.generated.line;
										}

										opt_sourceMap
											.addMapping(info);

										if (!test[info.source]) {
											test[info.source] = true;
											opt_sourceMap.setSourceContent(info.source, info.sourcesContent);
										}
									});
								}

								Parser.cursor++;
							}

							return compiledBlock;
						})

						.join('');
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
	 * @returns {boolean}
	 */
	static isValidContentBlock(block, labels, flags) {
		const
			flag = block.varName,
			flagVal = $C(flags).get(flag),
			blockVal = block.value;

		let res;
		switch (block.type) {
			case 'root':
				return true;

			case 'label':
				return Boolean(!Object.keys(labels).length || labels[block.label]);

			case 'is':
				res = typeof flagVal === 'function' ? flagVal({flag, flags, labels}) : flagVal;
				break;

			case 'eq':
				res = flagVal === blockVal;
				break;

			case 'ne':
				res = flagVal !== blockVal;
				break;

			case 'gt':
				res = flagVal > blockVal;
				break;

			case 'gte':
				res = flagVal >= blockVal;
				break;

			case 'lt':
				res = flagVal < blockVal;
				break;

			case 'lte':
				res = flagVal <= blockVal;
				break;

			case 'has':
				if (Array.isArray(flagVal)) {
					res = flagVal.includes(blockVal);

				} else if (flagVal instanceof RegExp) {
					res = flagVal.test(blockVal);

				} else if (flagVal) {
					if (typeof flagVal.has === 'function') {
						res = flagVal.has(blockVal);

					} else {
						res = flagVal[blockVal];
					}
				}

				break;

			case 'like':
				res = new RegExp(flagVal).test(blockVal);
				break;

			case 'call':
				if (typeof flagVal === 'function') {
					res = flagVal({flag, value: blockVal, flags, labels});
				}

				break;

			case 'callRight':
				if (typeof blockVal === 'function') {
					res = blockVal({flag, value: flagVal, flags, labels});
				}

				break;

			case 'typeof':
				res = typeof flagVal === String(blockVal);
				break;

			case 'instanceof':
				res = flagVal instanceof blockVal;
				break;
		}

		if (block.unless) {
			res = !res;
		}

		return Boolean(res || false);
	}
}
