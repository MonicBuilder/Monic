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
	uid = require('uid'),
	path = require('path');

const
	$C = require('collection.js/dist/collection');

/**
 * File structure class
 */
export class FileStructure {
	/**
	 * @param {string} file - file path
	 * @param {!Object} globals - map of global Monic flags
	 */
	constructor({file, globals}) {
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
	getRelativePathOf(src) {
		return Parser.normalizePath(path.resolve(path.dirname(this.file), src));
	}

	/**
	 * Adds custom code (text) to the structure
	 *
	 * @param {string} code - some code
	 * @param {Object=} [opt_info] - information object for a source map
	 * @return {!FileStructure}
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
	 * @return {!FileStructure}
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
	 * @return {!FileStructure}
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
	 * @param {boolean=} [opt_value] - flag value
	 * @return {!FileStructure}
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
	 * @return {!FileStructure}
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
	 * @param {(boolean|string)=} [opt_value] - condition value
	 * @param {boolean=} [opt_unless] - unless mode
	 * @return {!FileStructure}
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
	 * @return {!FileStructure}
	 */
	endIf() {
		if (!{eq: true, ne: true, gt: true, gte: true, lt: true, lte: true}[this.currentBlock.type]) {
			throw new SyntaxError(`Attempt to close an unopened block "#${this.currentBlock.unless ? 'unless' : 'if'}"`);
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
	 * @return {!FileStructure}
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
	 * @return {string}
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
	 * @return {!FileStructure}
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
	 * @return {string}
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

				$C(labels).forEach((el, key) =>
					block.labels[key] = true);

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
					return $C(block.content)
						.map((block) => {
							if (!Parser.current || this.uid !== Parser.current) {
								Parser.current = this.uid;
							}

							const
								{info} = block;

							const
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
	 * @return {boolean}
	 */
	static isValidContentBlock(block, labels, flags) {
		let res;
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
}
