/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

import path from 'path';
import glob from 'glob';
import fs from 'fs';
import async from 'async';

import { FileStructure } from './file';
import { SourceMapConsumer } from 'source-map';

/**
 * Parser class
 */
export default class Parser {
	/**
	 * @param {string} eol - EOL symbol
	 * @param {Array=} [replacers] - an array of transform functions
	 * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
	 * @param {?string=} [sourceRoot] - the root for all URLs in the generated source map
	 */
	constructor({eol, replacers, sourceMaps, sourceRoot}) {
		this.eol = eol;
		this.replacers = replacers;
		this.sourceMaps = sourceMaps;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
	}

	/**
	 * Normalizes a path
	 *
	 * @param {string} src - the path
	 * @return {string}
	 */
	static normalizePath(src) {
		return path.normalize(src).split(path.sep).join('/');
	}

	/**
	 * Solves the relative path from "from" to "to"
	 *
	 * @param {string} from
	 * @param {string} to
	 * @return {string}
	 */
	static getRelativePath(from, to) {
		return Parser.normalizePath(path.relative(from, to));
	}

	/**
	 * Checks a file for existence
	 * and returns an absolute path to it
	 *
	 * @param {string} file - the file path
	 * @param {function(Error, string=)} callback - a callback function
	 */
	testFile(file, callback) {
		file = Parser.normalizePath(path.resolve(file));

		if (this.realpathCache[file]) {
			callback(null, file);

		} else {
			async.waterfall([
				(next) => fs.stat(file, next),
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
	 * Parses path with glob
	 *
	 * @param {string} base - a path to the base file
	 * @param {string} src - the path
	 * @param {function(Error, !Array=)} callback - a callback function
	 */
	parsePath(base, src, callback) {
		const
			parts = src.split('::'),
			dirname = path.dirname(base);

		glob(path.join(dirname, parts[0]), null, (err, files) => {
			if (err) {
				return callback(err);
			}

			callback(
				null,

				$C(files).reduce((res, el) => {
					parts[0] = path.relative(dirname, el);
					res.push(parts.slice());
					return res;
				}, [])

			);
		});
	}

	/**
	 * Parses a file and returns it structure
	 *
	 * @param {string} file - the file path
	 * @param {function(Error, !FileStructure=, string=)} callback - a callback function
	 */
	parseFile(file, callback) {
		async.waterfall([
			(next) => this.testFile(file, next),

			(src, next) => {
				if (this.cache[src]) {
					return next(null, src, this.cache[src]);
				}

				fs.readFile(src, (err, content) => {
					next(err, src, String(content));
				});
			},

			(src, content, next) => {
				if (typeof content !== 'string') {
					return next(null, content, src);
				}

				this.parse(src, content, next);
			}

		], callback);
	}

	/**
	 * Parses a text and returns it structure
	 *
	 * @param {string} file - a path to a file
	 * @param {string} content - the source text
	 * @param {function(Error, !FileStructure=, string=)} callback - a callback function
	 */
	parse(file, content, callback) {
		if (this.cache[file]) {
			return callback(null, this.cache[file], file);
		}

		const
			actions = [];

		$C(this.replacers).forEach((replacer) => {
			actions.push((next) => {
				if (replacer.length > 2) {
					replacer(content, file, (err, res) => next(err, err ? undefined : content = res));

				} else {
					try {
						content = replacer(content, file);
						next();

					} catch (err) {
						err.fileName = file;
						next(err);
					}
				}
			});
		});

		let sourceMap;
		if (this.sourceMaps) {
			content = content.replace(/(?:\r?\n|\r)?[^\S\r\n]*\/\/(?:#|@) sourceMappingURL=([^\r\n]*)\s*$/, (sstr, url) => {
				actions.push((next) => {
					if (/data:application\/json;base64,(.*)/.exec(url)) {
						parse(new Buffer(RegExp.$1, 'base64').toString());

					} else {
						fs.readFile(path.normalize(path.resolve(path.dirname(file), url)), (err, str) => {
							parse(str);
						});
					}

					function parse(str) {
						try {
							sourceMap = new SourceMapConsumer(JSON.parse(str));
							content = content.replace(sstr, '');

						} catch (ignore) {

						} finally {
							next();
						}
					}
				});

				return sstr;
			});
		}

		async.series(actions, (err) => {
			if (err) {
				return callback(err);
			}

			const
				fileStructure = new FileStructure({file, eol: this.eol}),
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

				function asyncParseCallback(err) {
					if (err) {
						return error(err);
					}

					parseLines(i + 1);
				}

				let original;
				if (sourceMap) {
					let
						originalMap = [];

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

							} else if (this[key]) {
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
		});
	}

	/**
	 * Directive #include
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 * @param {string} value - a value of the directive
	 * @param {function(Error=)} callback - a callback function
	 */
	_include(struct, value, callback) {
		this.parsePath(struct.file, value, (err, arr) => {
			if (err) {
				return callback(err);
			}

			const
				actions = [];

			$C(arr).forEach((paramsParts) => {
				actions.push((next) => action.call(this, paramsParts, next));
			});

			async.series(actions, callback);
		});

		function action(paramsParts, next) {
			const
				includeFileName = paramsParts.shift();

			paramsParts = $C(paramsParts).reduce((res, el) => {
				res[el] = true;
				return res;
			}, {});

			if (includeFileName) {
				this.parseFile(struct.getRelativePathOf(includeFileName), (err, includeFile) => {
					if (err) {
						return next(err);
					}

					struct.addInclude(includeFile, paramsParts);
					next();
				});

			} else {
				$C(paramsParts).forEach((el, key) => {
					struct.root.labels[key] = true;
				});

				next();
			}
		}
	}

	/**
	 * Directive #without
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 * @param {string} value - a value of the directive
	 * @param {function(Error=)} callback - a callback function
	 */
	_without(struct, value, callback) {
		this.parsePath(struct.file, value, (err, arr) => {
			if (err) {
				return callback(err);
			}

			const
				actions = [];

			$C(arr).forEach((paramsParts) => {
				actions.push((next) => action.call(this, paramsParts, next));
			});

			async.series(actions, callback);
		});

		function action(paramsParts, next) {
			const
				includedFile = struct.getRelativePathOf(paramsParts.shift());

			paramsParts = $C(paramsParts).reduce((res, el) => {
				res[el] = true;
				return res;
			}, {});

			this.parseFile(includedFile, (err, includeFile) => {
				if (err) {
					return next(err);
				}

				struct.addWithout(includeFile, paramsParts);
				next();
			});
		}
	}

	/**
	 * Directive #label
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 * @param {string} value - a value of the directive
	 */
	_label(struct, value) {
		struct.beginLabel(value);
	}

	/**
	 * Directive #endlabel
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 */
	_endlabel(struct) {
		struct.endLabel();
	}

	/**
	 * Directive #if
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 * @param {string} value - a value of the directive
	 */
	_if(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "if" directive');
		}

		const
			args = value.split(/\s+/);

		let res = true;
		if (args.length > 1 && args[0] === 'not') {
			res = false;
			args.shift();
		}

		struct.beginIf(args[0], res);
	}

	/**
	 * Directive #endif
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 */
	_endif(struct) {
		struct.endIf();
	}

	/**
	 * Directive #set
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 * @param {string} value - a value of the directive
	 */
	_set(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "set" directive');
		}

		struct.addSet(value);
	}

	/**
	 * Directive #unset
	 *
	 * @private
	 * @param {!FileStructure} struct - a file structure
	 * @param {string} value - a value of the directive
	 */
	_unset(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "unset" directive');
		}

		struct.addUnset(value);
	}
}
