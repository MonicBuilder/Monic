'use strict';

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

import { FileStructure } from './file';

const
	ok = require('okay'),
	glob = require('glob-promise'),
	{hasMagic} = require('glob');

const
	path = require('path'),
	fs = require('fs-extra-promise');

const
	$C = require('collection.js/compiled');

const
	{SourceMapConsumer} = require('source-map');

/**
 * Parser class
 */
export default class Parser {
	/**
	 * @param {string} eol - EOL symbol
	 * @param {Array=} [replacers] - array of transform functions
	 * @param {Object=} [flags] - map of global Monic flags
	 * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
	 * @param {Object=} [inputSourceMap] - base source map object for the output source map
	 * @param {?string=} [sourceRoot] - root for all URLs in the generated source map
	 */
	constructor({eol, replacers, flags, sourceMaps, sourceRoot, inputSourceMap}) {
		this.eol = eol;
		this.replacers = replacers;
		this.flags = Object.assign({}, flags);
		this.sourceMaps = sourceMaps;
		this.inputSourceMap = inputSourceMap;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
	}

	/**
	 * Normalizes a path
	 *
	 * @param {string} src
	 * @returns {string}
	 */
	static normalizePath(src) {
		return path.normalize(src).split(path.sep).join('/');
	}

	/**
	 * Solves the relative path from "from" to "to"
	 *
	 * @param {string} from
	 * @param {string} to
	 * @returns {string}
	 */
	static getRelativePath(from, to) {
		return Parser.normalizePath(path.relative(from, to));
	}

	/**
	 * Checks a file for existence and returns the absolute path to it
	 *
	 * @param {string} file - file path
	 * @returns {string}
	 */
	async testFile(file) {
		file = Parser.normalizePath(path.resolve(file));

		if (this.realpathCache[file]) {
			return file;
		}

		const
			stat = await fs.statAsync(file);

		if (stat.isFile()) {
			throw new Error(`"${file}" is not a file`);
		}

		this.realpathCache[file] = true;
		return file;
	}

	/**
	 * Parses a path with glob
	 *
	 * @param {string} base - path to a base file
	 * @param {string} src - path
	 * @returns {!Array}
	 */
	async parsePath(base, src) {
		const
			parts = src.split('::'),
			dirname = path.dirname(base);

		parts[0] = parts[0].replace(/\$\{(.*?)}/g, (sstr, flag) =>
			flag in this.flags ? this.flags[flag] : '');

		const
			pattern = path.join(dirname, parts[0]);

		if (hasMagic(pattern)) {
			return $C(await glob(pattern)).reduce((res, el) => {
				parts[0] = path.relative(dirname, el);
				res.push(parts.slice());
				return res;
			}, []);
		}

		return [parts];
	}

	/**
	 * Parses a file and returns it structure
	 *
	 * @param {string} file - file path
	 * @returns {{fileStructure: (!FileStructure|undefined), file: string}}
	 */
	async parseFile(file) {
		const
			src = await this.testFile(file),
			content = this.cache[src] || await fs.readFileAsync(src, 'utf8');

		if (typeof content !== 'string') {
			return {struct: content, file: src};
		}

		return this.parse(src, content);
	}

	/**
	 * Parses a text and returns it structure
	 *
	 * @param {string} file - file path
	 * @param {string} content - source text
	 * @returns {{fileStructure: (!FileStructure|undefined), file: string}}
	 */
	async parse(file, content) {
		if (this.cache[file]) {
			return {fileStructure: this.cache[file], file};
		}

		const
			actions = [];

		$C(this.replacers).forEach((replacer) => {
			actions.push(async () => {
				if (replacer.length > 2) {
					await new Promise((resolve, reject) => {
						replacer.call(this, content, file, (err, res) => {
							if (err) {
								err.fileName = file;
								reject(err);
								return;
							}

							resolve(content = res);
						});
					});

				} else {
					try {
						content = await replacer.call(this, content, file);

					} catch (err) {
						err.fileName = file;
						throw err;
					}
				}
			});
		});

		let sourceMap;
		if (this.sourceMaps) {
			if (this.inputSourceMap) {
				sourceMap = new SourceMapConsumer(this.inputSourceMap);

			} else {
				content = content.replace(/(?:\r?\n|\r)?[^\S\r\n]*\/\/(?:#|@) sourceMappingURL=([^\r\n]*)\s*$/, (sstr, url) => {
					actions.push(async () => {
						if (/data:application\/json;base64,(.*)/.exec(url)) {
							parse(new Buffer(RegExp.$1, 'base64').toString());

						} else {
							parse(await fs.readFileAsync(path.normalize(path.resolve(path.dirname(file), url)), 'utf8'));
						}

						function parse(str) {
							try {
								sourceMap = new SourceMapConsumer(JSON.parse(str));
								content = content.replace(sstr, '');

							} catch (ignore) {}
						}
					});

					return sstr;
				});
			}
		}

		await $C(actions).async.forEach((fn) => fn());

		const
			fileStructure = new FileStructure({file, globals: this.flags}),
			lines = content.split(/\r?\n|\r/);

		this.cache[file] = fileStructure;
		const parseLines = (start) => {
			let
				info,
				i;

			function error(err) {
				err.fileName = file;
				err.lineNumber = i + 1;
				callback(err);
			}

			const
				asyncParseCallback = ok(error, () => parseLines(i + 1));

			let original;
			if (sourceMap) {
				const originalMap = [];
				sourceMap.eachMapping((el) => {
					originalMap.push({
						generated: {
							line: el.generatedLine,
							column: el.generatedColumn
						},

						original: {
							line: el.originalLine,
							column: el.originalColumn
						},

						source: el.source,
						name: el.name
					});
				});

				if (sourceMap.sourcesContent) {
					$C(sourceMap.sourcesContent).forEach((content, i) => {
						const
							src = sourceMap.sources[i];

						$C(originalMap).forEach((el) => {
							if (el.source === src) {
								el.source = Parser.normalizePath(path.resolve(el.source));

								if (this.sourceRoot) {
									el.source = Parser.getRelativePath(this.sourceRoot, el.source);
								}

								el.sourcesContent = content;
							}
						});
					});
				}

				original = $C(originalMap).group('generated > line');
			}

			for (i = start; i < lines.length; i++) {
				const
					pos = i + 1,
					line = lines[i],
					val = line + this.eol;

				if (this.sourceMaps) {
					if (original) {
						info = original[pos] || {ignore: true};

					} else {
						info = {
							generated: {
								column: 0
							},

							original: {
								line: pos,
								column: 0
							},

							source: this.sourceRoot ?
								Parser.getRelativePath(this.sourceRoot, file) : file,

							sourcesContent: content || this.eol,
							line
						};
					}
				}

				if (line.match(/^\s*\/\/#(.*)/)) {
					if (RegExp.$1) {
						const
							command = RegExp.$1.split(' '),
							dir = command.shift();

						const
							key = `_${dir}`,
							params = command.join(' ');

						if (/^(?:include|without)$/.test(dir)) {
							return this[key](fileStructure, params, asyncParseCallback);
						}

						if (this[key]) {
							try {
								this[key](fileStructure, params);

							} catch (err) {
								return error(err);
							}

						} else {
							fileStructure.addCode(val, info);
						}
					}

				} else {
					fileStructure.addCode(val, info);
				}
			}

			callback(null, fileStructure, file);
		};

		parseLines(0);
	}

	/**
	 * Directive #include
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	async _include(struct, value) {
		$C(await this.parsePath(struct.file, value)).async.forEach(async (el) => {
			const includeFileName = String(el.shift());
			el = $C(el).reduce((map, el) => (map[el] = true, map), {});

			if (includeFileName) {
				struct.addInclude((await this.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);

			} else {
				$C(el).forEach((el, key) => struct.root.labels[key] = true);
			}
		});
	}

	/**
	 * Directive #without
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	async _without(struct, value) {
		$C(await this.parsePath(struct.file, value)).async.forEach(async (el) => {
			const includeFileName = String(el.shift());
			el = $C(el).reduce((map, el) => (map[el] = true, map), {});

			struct.addWithout((await this.parseFile(struct.getRelativePathOf(includeFileName))).fileStructure, el);
		});
	}

	/**
	 * Directive #end
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	_end(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#end" directive');
		}

		const
			args = value.split(/\s+/),
			key = `_end${args[0]}`;

		if (!this[key]) {
			throw new SyntaxError(`Bad value (${args[0]}) for "#end" directive`);
		}

		this[key](struct, args.join(' '));
	}

	/**
	 * Directive #label
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	_label(struct, value) {
		struct.beginLabel(value);
	}

	/**
	 * Directive #endlabel
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 */
	_endlabel(struct) {
		struct.endLabel();
	}

	/**
	 * Directive #if
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 * @param {boolean=} [opt_unless] - unless mode
	 */
	_if(struct, value, opt_unless) {
		value = value.trim();

		const
			args = value.split(/\s+/);

		switch (args.length) {
			case 1:
				args.push('eq', true);
				break;

			case 2:
				args.push(true);
				break;
		}

		if (!value || args.length !== 3) {
			throw new SyntaxError(`Bad "#${opt_unless ? 'unless' : 'if'}" directive`);
		}

		struct.beginIf(...args.concat(opt_unless));
	}

	/**
	 * Directive #endif
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 */
	_endif(struct) {
		struct.endIf();
	}

	/**
	 * Directive #unless
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	_unless(struct, value) {
		this._if(struct, value, true);
	}

	/**
	 * Directive #endunless
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 */
	_endunless(struct) {
		struct.endIf();
	}

	/**
	 * Directive #set
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	_set(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#set" directive');
		}

		struct.addSet(...value.split(/\s+/));
	}

	/**
	 * Directive #unset
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 */
	_unset(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#unset" directive');
		}

		struct.addUnset(value);
	}
}
