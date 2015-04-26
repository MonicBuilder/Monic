import path from 'path';
import Parser from './parser';

/**
 * File structure class
 */
export class FileStructure {
	/**
	 * @param {string} src - a path to a file
	 * @param {string} lineSeparator - EOL symbol
	 */
	constructor(src, lineSeparator) {
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
	getRelativePathOf(src) {
		return path.normalize(path.resolve(path.dirname(this.fname), src));
	}

	/**
	 * Adds custom JavaScript to the structure
	 *
	 * @param {string} code - some JavaScript code
	 * @param {!Object} info - an information object for a source map
	 * @return {!FileStructure}
	 */
	addCode(code, info) {
		code = code || this.nl;
		this.currentBlock.content.push({
			type: 'code',
			included: false,
			info,
			code
		});

		return this;
	}

	/**
	 * Adds a file to the structure
	 *
	 * @param {!FileStructure} fileStructure - the structure of the adding file
	 * @param {!Object} labels - a map of labels
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
	 * @param {!FileStructure} fileStructure - the structure of the expulsion file
	 * @param {!Object} labels - a map of labels
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
	 * @param {string} flag - the flag name
	 * @return {!FileStructure}
	 */
	addSet(flag) {
		this.currentBlock.content.push({
			type: 'set',
			varName: flag,
			value: true
		});

		return this;
	}

	/**
	 * Cancels a flag
	 *
	 * @param {string} flag - the flag name
	 * @return {!FileStructure}
	 */
	addUnset(flag) {
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
	 * @param {string} flag - the condition
	 * @param {boolean} value - a value of the condition
	 * @return {!FileStructure}
	 */
	beginIf(flag, value) {
		const ifBlock = {
			parent: this.currentBlock,
			type: 'if',
			content: [],
			varName: flag,
			value
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
		if (this.currentBlock.type != 'if') {
			throw new Error('Attempt to close an unopened block "#if"');
		}

		this.currentBlock = this.currentBlock.parent;
		return this;
	}

	/**
	 * Sets a label
	 *
	 * @param {string} label - the label name
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
			throw new Error('Attempt to close an unopened block "#label"');
		}

		this.currentBlock = this.currentBlock.parent;
		return this;
	}

	/**
	 * Adds an error to the structure
	 *
	 * @param {string} msg - the error text
	 * @param {!Object} info - an information object for a source map
	 * @return {!FileStructure}
	 */
	error(msg, info) {
		this.addCode(`throw new Error(${JSON.stringify(`MonicError: ${msg}`)});${this.nl}`, info);
		return this;
	}

	/**
	 * Compiles the structure
	 *
	 * @param {Array=} [opt_labels] - a map of labels
	 * @param {Object=} [opt_flags] - a map of flags
	 * @param {SourceMapGenerator=} [opt_sourceMap] - a source map object
	 * @return {string}
	 */
	compile(opt_labels, opt_flags, opt_sourceMap) {
		$C(opt_labels).forEach((el, key) => {
			this.root.labels[key] = true;
		});

		return this._compileBlock(this.root, this.root.labels, opt_flags || {}, opt_sourceMap);
	}

	/**
	 * Compiles expulsion of a file
	 *
	 * @param {Array=} [opt_labels] - a map of labels
	 * @param {Object=} [opt_flags] - a map of flags
	 * @param {SourceMapGenerator=} [opt_sourceMap] - a source map object
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
	 * @param {!Object} block - the structure object
	 * @param {!Object} labels - a map of labels
	 * @param {!Object} flags - a map of flags
	 * @param {SourceMapGenerator=} [opt_sourceMap] - a source map object
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
				const cacheKey =
					block.fileStructure.fname +
					'@' + Object.keys(block.labels).sort() +
					'@' + Object.keys(flags).sort();

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

			case 'set':
				flags[block.varName] = block.value;
				break;

			default:
				if (FileStructure.isValidContentBlock(block, labels, flags)) {
					return $C(block.content)
						.map((block) => {
							const
								info = block.info;

							if (opt_sourceMap && info) {
								const
									test = {};

								Parser.cursor++;
								$C(info.source ? [info] : info).forEach((info) => {
									info.generated.line = Parser.cursor;
									opt_sourceMap.addMapping(info);

									if (!test[info.source]) {
										test[info.source] = true;
										opt_sourceMap.setSourceContent(info.source, info.sourcesContent);
									}
								});
							}

							return this._compileBlock(block, labels, flags, opt_sourceMap);
						})

						.join('');
				}
		}

		return '';
	}

	/**
	 * Returns true if an object is valid file structure
	 *
	 * @param {!Object} block - the structure object
	 * @param {!Object} labels - a map of labels
	 * @param {!Object} flags - a map of flags
	 * @return {boolean}
	 */
	static isValidContentBlock(block, labels, flags) {
		switch (block.type) {
			case 'root':
				return true;

			case 'if':
				return Boolean(flags[block.varName]) === Boolean(block.value);

			case 'label':
				return Boolean(!Object.keys(labels).length || labels[block.label]);
		}

		return false;
	}
}
