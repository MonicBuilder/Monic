/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

declare namespace SourceMap {
	//#include ../node_modules/source-map/source-map.d.ts
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
