/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

declare namespace SourceMap {
// Type definitions for source-map 0.5
// Project: https://github.com/mozilla/source-map
// Definitions by: Morten Houston Ludvigsen <https://github.com/MortenHoustonLudvigsen>,
//                 Ron Buckton <https://github.com/rbuckton>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export type SourceMapUrl = string;

export interface StartOfSourceMap {
    file?: string;
    sourceRoot?: string;
    skipValidation?: boolean;
}

export interface RawSourceMap {
    version: number;
    sources: string[];
    names: string[];
    sourceRoot?: string;
    sourcesContent?: string[];
    mappings: string;
    file: string;
}

export interface RawIndexMap extends StartOfSourceMap {
    version: number;
    sections: RawSection[];
}

export interface RawSection {
    offset: Position;
    map: RawSourceMap;
}

export interface Position {
    line: number;
    column: number;
}

export interface NullablePosition {
    line: number | null;
    column: number | null;
    lastColumn: number | null;
}

export interface MappedPosition {
    source: string;
    line: number;
    column: number;
    name?: string;
}

export interface NullableMappedPosition {
    source: string | null;
    line: number | null;
    column: number | null;
    name: string | null;
}

export interface MappingItem {
    source: string;
    generatedLine: number;
    generatedColumn: number;
    originalLine: number;
    originalColumn: number;
    name: string;
}

export interface Mapping {
    generated: Position;
    original: Position;
    source: string;
    name?: string;
}

export interface CodeWithSourceMap {
    code: string;
    map: SourceMapGenerator;
}

export interface SourceMapConsumer {
    /**
     * Compute the last column for each generated mapping. The last column is
     * inclusive.
     */
    computeColumnSpans(): void;

    /**
     * Returns the original source, line, and column information for the generated
     * source's line and column positions provided. The only argument is an object
     * with the following properties:
     *
     *   - line: The line number in the generated source.
     *   - column: The column number in the generated source.
     *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
     *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
     *
     * and an object is returned with the following properties:
     *
     *   - source: The original source file, or null.
     *   - line: The line number in the original source, or null.
     *   - column: The column number in the original source, or null.
     *   - name: The original identifier, or null.
     */
    originalPositionFor(generatedPosition: Position & { bias?: number }): NullableMappedPosition;

    /**
     * Returns the generated line and column information for the original source,
     * line, and column positions provided. The only argument is an object with
     * the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *   - column: The column number in the original source.
     *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
     *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
     *
     * and an object is returned with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    generatedPositionFor(originalPosition: MappedPosition & { bias?: number }): NullablePosition;

    /**
     * Returns all generated line and column information for the original source,
     * line, and column provided. If no column is provided, returns all mappings
     * corresponding to a either the line we are searching for or the next
     * closest line that has any mappings. Otherwise, returns all mappings
     * corresponding to the given line and either the column we are searching for
     * or the next closest column that has any offsets.
     *
     * The only argument is an object with the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *   - column: Optional. the column number in the original source.
     *
     * and an array of objects is returned, each with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    allGeneratedPositionsFor(originalPosition: MappedPosition): NullablePosition[];

    /**
     * Return true if we have the source content for every source in the source
     * map, false otherwise.
     */
    hasContentsOfAllSources(): boolean;

    /**
     * Returns the original source content. The only argument is the url of the
     * original source file. Returns null if no original source content is
     * available.
     */
    sourceContentFor(source: string, returnNullOnMissing?: boolean): string | null;

    /**
     * Iterate over each mapping between an original source/line/column and a
     * generated line/column in this source map.
     *
     * @param callback
     *        The function that is called with each mapping.
     * @param context
     *        Optional. If specified, this object will be the value of `this` every
     *        time that `aCallback` is called.
     * @param order
     *        Either `SourceMapConsumer.GENERATED_ORDER` or
     *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
     *        iterate over the mappings sorted by the generated file's line/column
     *        order or the original's source/line/column order, respectively. Defaults to
     *        `SourceMapConsumer.GENERATED_ORDER`.
     */
    eachMapping(callback: (mapping: MappingItem) => void, context?: any, order?: number): void;
}

export interface SourceMapConsumerConstructor {
    prototype: SourceMapConsumer;

    GENERATED_ORDER: number;
    ORIGINAL_ORDER: number;
    GREATEST_LOWER_BOUND: number;
    LEAST_UPPER_BOUND: number;

    new (rawSourceMap: RawSourceMap, sourceMapUrl?: SourceMapUrl): BasicSourceMapConsumer;
    new (rawSourceMap: RawIndexMap, sourceMapUrl?: SourceMapUrl): IndexedSourceMapConsumer;
    new (rawSourceMap: RawSourceMap | RawIndexMap | string, sourceMapUrl?: SourceMapUrl): BasicSourceMapConsumer | IndexedSourceMapConsumer;

    /**
     * Create a BasicSourceMapConsumer from a SourceMapGenerator.
     *
     * @param sourceMap
     *        The source map that will be consumed.
     */
    fromSourceMap(sourceMap: SourceMapGenerator, sourceMapUrl?: SourceMapUrl): BasicSourceMapConsumer;
}

export const SourceMapConsumer: SourceMapConsumerConstructor;

export interface BasicSourceMapConsumer extends SourceMapConsumer {
    file: string;
    sourceRoot: string;
    sources: string[];
    sourcesContent: string[];
}

export interface BasicSourceMapConsumerConstructor {
    prototype: BasicSourceMapConsumer;

    new (rawSourceMap: RawSourceMap | string): BasicSourceMapConsumer;

    /**
     * Create a BasicSourceMapConsumer from a SourceMapGenerator.
     *
     * @param sourceMap
     *        The source map that will be consumed.
     */
    fromSourceMap(sourceMap: SourceMapGenerator): BasicSourceMapConsumer;
}

export const BasicSourceMapConsumer: BasicSourceMapConsumerConstructor;

export interface IndexedSourceMapConsumer extends SourceMapConsumer {
    sources: string[];
}

export interface IndexedSourceMapConsumerConstructor {
    prototype: IndexedSourceMapConsumer;

    new (rawSourceMap: RawIndexMap | string): IndexedSourceMapConsumer;
}

export const IndexedSourceMapConsumer: IndexedSourceMapConsumerConstructor;

export class SourceMapGenerator {
    constructor(startOfSourceMap?: StartOfSourceMap);

    /**
     * Creates a new SourceMapGenerator based on a SourceMapConsumer
     *
     * @param sourceMapConsumer The SourceMap.
     */
    static fromSourceMap(sourceMapConsumer: SourceMapConsumer): SourceMapGenerator;

    /**
     * Add a single mapping from original source line and column to the generated
     * source's line and column for this source map being created. The mapping
     * object should have the following properties:
     *
     *   - generated: An object with the generated line and column positions.
     *   - original: An object with the original line and column positions.
     *   - source: The original source file (relative to the sourceRoot).
     *   - name: An optional original token name for this mapping.
     */
    addMapping(mapping: Mapping): void;

    /**
     * Set the source content for a source file.
     */
    setSourceContent(sourceFile: string, sourceContent: string): void;

    /**
     * Applies the mappings of a sub-source-map for a specific source file to the
     * source map being generated. Each mapping to the supplied source file is
     * rewritten using the supplied source map. Note: The resolution for the
     * resulting mappings is the minimium of this map and the supplied map.
     *
     * @param sourceMapConsumer The source map to be applied.
     * @param sourceFile Optional. The filename of the source file.
     *        If omitted, SourceMapConsumer's file property will be used.
     * @param sourceMapPath Optional. The dirname of the path to the source map
     *        to be applied. If relative, it is relative to the SourceMapConsumer.
     *        This parameter is needed when the two source maps aren't in the same
     *        directory, and the source map to be applied contains relative source
     *        paths. If so, those relative source paths need to be rewritten
     *        relative to the SourceMapGenerator.
     */
    applySourceMap(sourceMapConsumer: SourceMapConsumer, sourceFile?: string, sourceMapPath?: string): void;

    toString(): string;

    toJSON(): RawSourceMap;
}

export class SourceNode {
    children: SourceNode[];
    sourceContents: any;
    line: number;
    column: number;
    source: string;
    name: string;

    constructor();
    constructor(
        line: number | null,
        column: number | null,
        source: string | null,
        chunks?: Array<(string | SourceNode)> | SourceNode | string,
        name?: string
    );

    static fromStringWithSourceMap(
        code: string,
        sourceMapConsumer: SourceMapConsumer,
        relativePath?: string
    ): SourceNode;

    add(chunk: Array<(string | SourceNode)> | SourceNode | string): SourceNode;

    prepend(chunk: Array<(string | SourceNode)> | SourceNode | string): SourceNode;

    setSourceContent(sourceFile: string, sourceContent: string): void;

    walk(fn: (chunk: string, mapping: MappedPosition) => void): void;

    walkSourceContents(fn: (file: string, content: string) => void): void;

    join(sep: string): SourceNode;

    replaceRight(pattern: string, replacement: string): SourceNode;

    toString(): string;

    toStringWithSourceMap(startOfSourceMap?: StartOfSourceMap): CodeWithSourceMap;
}

}

declare namespace MonicBuilder {
	class FileStructure {
		static isValidContentBlock(block: Record<string, any>, labels: Record<string, boolean>, flags: Record<string, any>): boolean;
		constructor(params: {file: string, globals: Record<string, any>});
		getRelativePathOf(src: string): string;
		addCode(code: string, info?: Record<string, any>): this;
		addInclude(fileStructure: FileStructure, labels: Record<string, boolean>): this;
		addWithout(fileStructure: FileStructure, labels: Record<string, boolean>): this;
		addSet(flag: string, value?: any): this;
		addUnset(flag: string): this;
		beginIf(flag: string, type: string, value?: any, unless?: boolean): this;
		endIf(): this;
		beginLabel(label: string): this;
		endLabel(): this;
		without(labels?: string[], flags?: Record<string, any>, sourceMap?: SourceMap.SourceMapGenerator): this;
		compile(labels?: string[], flags?: Record<string, any>, sourceMap?: SourceMap.SourceMapGenerator): string;
	}

	class Parser {
		static parseExpr(expr: any): any;
		static normalizePath(src: string): string;
		static getRelativePath(from: string, to: string): string;
		eol: string;
		replacers: Function[];
		flags: Record<string, any>;
		sourceMaps?: boolean | string;
		inputSourceMap?: SourceMap.SourceMapConsumer;
		sourceRoot?: string;
		constructor(params: CompileParams);
		testFile(file: string): Promise<string>;
		parsePath(base: string, src: string): Promise<string[][]>;
		parseFile(file: string): Promise<{fileStructure: FileStructure, file: string}>;
		parse(file: string, content: string): Promise<{fileStructure: FileStructure, file: string}>;
	}

	interface CompileParams {
		cwd?: string;
		contents?: string;
		eol?: string;
		flags?: Record<string, any>;
		labels?: Record<string, boolean>;
		replacers?: Array<(this: Parser, text: string, file: string, cb: (err?: Error | null, text?: string) => any) => any>;
		saveFiles?: boolean;
		file?: string;
		sourceMaps?: boolean | string;
		inputSourceMap?: SourceMap.SourceMapConsumer;
		sourceMapFile: string;
		sourceRoot?: string;
	}

	const Monic: {
		VERSION: any[];
		compile(
			file: string,
			params?: CompileParams,
			cb?: (err?: Error | null, res?: string, sourceMap?: {
				map: SourceMap.RawSourceMap,
				decl: string,
				url: string,
				isExternal: boolean
			}) => void
		): Promise<string>;
	};
}

declare module 'monic' {
	export = MonicBuilder.Monic;
}

