import path from 'path';
import glob from 'glob';
import fs from 'fs';
import async from 'async';

import { MonicError } from './error';
import { FileStructure } from './file';
import { $C } from 'collection.js';

/**
 * Parser class
 */
export default class Parser {
	/**
	 * @param {{
	 *   lineSeparator: string,
	 *   replacers: !Array
	 * }} params - additional parameters:
	 *   *) params.lineSeparator - EOL symbol;
	 *   *) params.replacers - an array of transform functions.
	 */
	constructor(params) {
		this.nl = params.lineSeparator;
		this.replacers = params.replacers || [];
		this.realpathCache = {};
		this.cache = {};
	}

	/**
	 * Checks a file for existence
	 * and returns an absolute path to it
	 *
	 * @param {string} file - the file path
	 * @param {function(Error, string=)} callback - a callback function
	 */
	normalizePath(file, callback) {
		file = path.normalize(path.resolve(file));

		if (this.realpathCache[file]) {
			callback(null, file);

		} else {
			async.waterfall([
				(next) => {
					fs.stat(file, (err, stat) => {
						next(err, stat);
					});
				},

				(stat, next) => {
					if (!stat.isFile()) {
						return next(new Error(`"${file}" is not a file`));
					}

					this.realpathCache[file] = true;
					next(null, file);
				}

			], callback);
		}
	}

	/**
	 * Parses a file and returns it structure
	 *
	 * @param {string} file - the file path
	 * @param {function(Error, FileStructure=, string=)} callback - a callback function
	 */
	parseFile(file, callback) {
		this.normalizePath(file, (err, src) => {
			if (err) {
				return callback(err);
			}

			if (this.cache[src]) {
				return callback(null, this.cache[src], src);
			}

			fs.readFile(src, (err, content) => {
				if (err) {
					return callback(err);
				}

				this.parse(src, String(content), callback);
			});
		});
	}

	/**
	 * Parses a text and returns it structure
	 *
	 * @param {string} file - a path to a file
	 * @param {string} content - the source text
	 * @param {function(Error, FileStructure=, string=)} callback - a callback function
	 */
	parse(file, content, callback) {
		if (this.cache[file]) {
			return callback(null, this.cache[file], file);
		}

		const
			actions = [],
			dirname = path.dirname(file);

		content = this.replacers.reduce((content, el) => {
			content = el(content, file);
			return content;

		}, content);

		// URL transformers
		content = content.replace(/^(\s*\/\/(?:#include|without)\s+)(.*)/gm, (sstr, decl, src) => {
			if (/\*/.test(src)) {
				actions.push((cb) => {
					const parts = src.split('::');
					glob(path.join(dirname, parts[0]), null, (err, files) => {
						if (files) {
							content = content.replace(sstr, files.reduce((res, el) => {
								parts[0] = path.relative(dirname, el);
								res += decl + parts.join('::') + this.nl;
								return res;
							}, ''));
						}

						cb(err, files);
					});
				});
			}

			return sstr;
		});

		async.parallel(actions, (err) => {
			if (err) {
				return callback(err);
			}

			const
				fileStructure = new FileStructure(file, this.nl),
				lines = content.split(/\r?\n|\r/);

			this.cache[file] = fileStructure;
			const parseLines = (start) => {
				const
					errors = [];

				let
					info,
					i;

				function appendError(err) {
					const
						msg = err.message;

					console.error(file, i + 1);
					errors.push(new MonicError(msg, file, i + 1));
					fileStructure.error(msg, info);
				}

				function asyncParseCallback(err) {
					if (err) {
						appendError(err);
					}

					parseLines(i + 1);
				}

				for (i = start; i < lines.length; i++) {
					const
						line = lines[i],
						val = line + (i < lines.length - 1 ? this.nl : '');

					info = {
						generated: {
							column: 0
						},

						original: {
							line: i + 1,
							column: 0
						},

						source: file,
						sourcesContent: content,
						line
					};

					if (line.match(/^\s*\/\/#(.*)/)) {
						if (RegExp.$1) {
							const
								command = RegExp.$1.split(' '),
								dir = String(command.shift());

							const
								key = '_' + dir,
								params = command.join(' ');

							if (/^(?:include|without)$/.test(dir)) {
								return this[key](fileStructure, params, asyncParseCallback);

							} else if (/^(?:label|endlabel|if|endif|set|unset)$/.test(dir)) {
								try {
									this[key](fileStructure, params);

								} catch (err) {
									appendError(err);
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
		});
	}

	/**
	 * Directive #include
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 * @param {string} value - a value of the directive
	 * @param {function(Error=)} callback - a callback function
	 */
	_include(file, value, callback) {
		let
			paramsParts = value.split('::'),
			includeFileName = paramsParts.shift();

		paramsParts = paramsParts.reduce((res, el) => {
			res[el] = true;
			return res;
		}, {});

		if (includeFileName) {
			this.parseFile(file.getRelativePathOf(includeFileName), (err, includeFile) => {
				if (err) {
					return callback(err);
				}

				file.addInclude(includeFile, paramsParts);
				callback();
			});

		} else {
			$C(paramsParts).forEach((el, key) => {
				file.root.labels[key] = true;
			});

			callback();
		}
	}

	/**
	 * Directive #without
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 * @param {string} value - a value of the directive
	 * @param {function(Error=)} callback - a callback function
	 */
	_without(file, value, callback) {
		let
			paramsParts = value.split('::'),
			includeFname = file.getRelativePathOf(paramsParts.shift());

		paramsParts = paramsParts.reduce((res, el) => {
			res[el] = true;
			return res;
		}, {});

		this.parseFile(includeFname, (err, includeFile) => {
			if (err) {
				return callback(err);
			}

			file.addWithout(includeFile, paramsParts);
			callback();
		});
	}

	/**
	 * Directive #label
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 * @param {string} value - a value of the directive
	 */
	_label(file, value) {
		file.beginLabel(value);
	}

	/**
	 * Directive #endlabel
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 */
	_endlabel(file) {
		file.endLabel();
	}

	/**
	 * Directive #if
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 * @param {string} value - a value of the directive
	 */
	_if(file, value) {
		if (!value.trim()) {
			throw new Error('Bad "if" directive');
		}

		const
			args = value.split(/\s+/);

		let res = true;
		if (args.length > 1 && args[0] === 'not') {
			res = false;
			args.shift();
		}

		file.beginIf(args[0], res);
	}

	/**
	 * Directive #endif
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 */
	_endif(file) {
		file.endIf();
	}

	/**
	 * Directive #set
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 * @param {string} value - a value of the directive
	 */
	_set(file, value) {
		if (!value.trim()) {
			throw new Error('Bad "set" directive');
		}

		file.addSet(value.split(/\s+/)[0]);
	}

	/**
	 * Directive #unset
	 *
	 * @private
	 * @param {!FileStructure} file - a file structure
	 * @param {string} value - a value of the directive
	 */
	_unset(file, value) {
		if (!value.trim()) {
			throw new Error('Bad "unset" directive');
		}

		file.addUnset(value.split(/\s+/)[0]);
	}
}
