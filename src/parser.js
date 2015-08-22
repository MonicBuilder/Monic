/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

import ok from 'okay';

import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';
import * as async from 'async';

import { FileStructure } from './file';
import { SourceMapConsumer } from 'source-map';
import { $C } from 'collection.js';

/**
 * Parser class
 */
export default class Parser {
	/**
	 * @param {string} eol - EOL symbol
	 * @param {Array=} [replacers] - array of transform functions
	 * @param {boolean} sourceMaps - if is true, then will be enabled support for source maps
	 * @param {Object=} [inputSourceMap] - base source map object for the output source map
	 * @param {?string=} [sourceRoot] - root for all URLs in the generated source map
	 */
	constructor({eol, replacers, sourceMaps, sourceRoot, inputSourceMap}) {
		this.eol = eol;
		this.replacers = replacers;
		this.sourceMaps = sourceMaps;
		this.inputSourceMap = inputSourceMap;
		this.sourceRoot = sourceRoot;
		this.realpathCache = {};
		this.cache = {};
	}

	/**
	 * Normalizes a path
	 *
	 * @param {string} src - path
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
	 * @param {string} file - file path
	 * @param {function(Error, string=)} callback - callback function
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
	 * Parses a path with glob
	 *
	 * @param {string} base - path to a base file
	 * @param {string} src - path
	 * @param {function(Error, !Array=)} callback - callback function
	 */
	parsePath(base, src, callback) {
		const
			parts = src.split('::'),
			dirname = path.dirname(base),
			pattern = path.join(dirname, parts[0]);

		if (glob.hasMagic(pattern)) {
			glob(pattern, null, ok(callback, (files) => {
				callback(
					null,

					$C(files).reduce((res, el) => {
						parts[0] = path.relative(dirname, el);
						res.push(parts.slice());
						return res;
					}, [])

				);
			}));

		} else {
			callback(null, [parts]);
		}
	}

	/**
	 * Parses a file and returns it structure
	 *
	 * @param {string} file - file path
	 * @param {function(Error, !FileStructure=, string=)} callback - callback function
	 */
	parseFile(file, callback) {
		async.waterfall([
			(next) => this.testFile(file, next),

			(src, next) => {
				if (this.cache[src]) {
					return next(null, src, this.cache[src]);
				}

				fs.readFile(src, 'utf8', (err, content) => next(err, src, content));
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
	 * @param {string} file - file path
	 * @param {string} content - source text
	 * @param {function(Error, !FileStructure=, string=)} callback - callback function
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
					replacer.call(this, content, file, (err, res) =>
						next(err, err ? undefined : content = res));

				} else {
					try {
						content = replacer.call(this, content, file);
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
			if (this.inputSourceMap) {
				sourceMap = new SourceMapConsumer(this.inputSourceMap);

			} else {
				content = content.replace(/(?:\r?\n|\r)?[^\S\r\n]*\/\/(?:#|@) sourceMappingURL=([^\r\n]*)\s*$/, (sstr, url) => {
					actions.push((next) => {
						if (/data:application\/json;base64,(.*)/.exec(url)) {
							parse(new Buffer(RegExp.$1, 'base64').toString());

						} else {
							fs.readFile(path.normalize(path.resolve(path.dirname(file), url)), 'utf8', (err, str) => {
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
		}

		async.series(actions, ok(callback, () => {
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
		}));
	}

	/**
	 * Directive #include
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 * @param {function(Error=)} callback - callback function
	 */
	_include(struct, value, callback) {
		this.parsePath(struct.file, value, ok(callback, (arr) => {
			const
				actions = [];

			$C(arr).forEach((paramsParts) => {
				actions.push((next) => action.call(this, paramsParts, next));
			});

			async.series(actions, callback);
		}));

		function action(paramsParts, next) {
			const
				includeFileName = paramsParts.shift();

			paramsParts = $C(paramsParts).reduce((map, el) =>
				(map[el] = true, map), {});

			if (includeFileName) {
				this.parseFile(struct.getRelativePathOf(includeFileName), ok(next, (includeFile) => {
					struct.addInclude(includeFile, paramsParts);
					next();
				}));

			} else {
				$C(paramsParts).forEach((el, key) => struct.root.labels[key] = true);
				next();
			}
		}
	}

	/**
	 * Directive #without
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 * @param {string} value - directive value
	 * @param {function(Error=)} callback - callback function
	 */
	_without(struct, value, callback) {
		this.parsePath(struct.file, value, ok(callback, (arr) => {
			const
				actions = [];

			$C(arr).forEach((paramsParts) => {
				actions.push((next) => action.call(this, paramsParts, next));
			});

			async.series(actions, callback);
		}));

		function action(paramsParts, next) {
			const
				includedFile = struct.getRelativePathOf(paramsParts.shift());

			paramsParts = $C(paramsParts).reduce((map, el) =>
				(map[el] = true, map), {});

			this.parseFile(includedFile, ok(next, (includeFile) => {
				struct.addWithout(includeFile, paramsParts);
				next();
			}));
		}
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
	 */
	_if(struct, value) {
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#if" directive');
		}

		struct.beginIf(...value.split(/\s+/));
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
		value = value.trim();

		if (!value) {
			throw new SyntaxError('Bad "#unless" directive');
		}

		struct.beginUnless(...value.split(/\s+/));
	}

	/**
	 * Directive #endunless
	 *
	 * @private
	 * @param {!FileStructure} struct - file structure
	 */
	_endunless(struct) {
		struct.endUnless();
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
