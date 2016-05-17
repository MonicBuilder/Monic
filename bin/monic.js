#!/usr/bin/env node

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

var
	monic = require('../monic'),
	Parser = require('../dist/parser').default,
	program = require('commander');

var
	path = require('path'),
	fs = require('fs');

program
	.version(monic.VERSION.join('.'))
	.usage('[options] [file ...]')
	.option('-f, --file [string]', 'path to the source file (meta information)')
	.option('-o, --output [string]', 'path to the output file')
	.option('--eol [char]', 'EOL symbol')
	.option('--flags [list]', 'list of flags separated by commas')
	.option('--labels [list]', 'list of labels separated by commas')
	.option('-s, --source-maps [string]', '[true|false|inline]')
	.option('--source-map-file [string]', 'path to the generated source map')
	.option('--source-root [string]', 'root for all URLs inside the generated source map')
	.parse(process.argv);

var
	file,
	input;

var
	args = program['args'],
	out = program['output'],
	eol = program['eol'] || '\n',
	cwd = process.cwd();

if (args.length) {
	input = args.join(' ');

	if (fs.existsSync(input)) {
		file = input;
		input = undefined;
	}
}

function action(file, input) {
	console.time('Time');

	if (!file) {
		error('Invalid input data');
	}

	function toObj(res, el) {
		res[el] = true;
		return res;
	}

	function url(url) {
		return Parser.getRelativePath(cwd, path.resolve(url));
	}

	function line(opt_error) {
		console[opt_error ? 'error' : 'log'](new Array(80).join(opt_error ? '!' : '~'));
	}

	function date(opt_error) {
		console[opt_error ? 'error' : 'log']('[[ ' + new Date().toString() + ' ]]');
	}

	function error(err) {
		line(true);
		console.error(err.toString());

		if (err.fileName) {
			console.error('File: ' + url(err.fileName));
		}

		if (err.lineNumber) {
			console.error('Line: ' + err.lineNumber);
		}

		date(true);
		line(true);
		process.exit(1);
	}

	function parse(val) {
		switch (val) {
			case 'true':
				return true;

			case 'false':
				return false;

			default:
				return val;
		}
	}

	monic.compile(file, {
		cwd: cwd,
		saveFiles: true,
		content: input,
		eol: eol,
		flags: (program['flags'] || '').split(',').reduce(toObj, {}),
		labels: (program['labels'] || '').split(',').reduce(toObj, {}),
		file: out,
		sourceMaps: parse(program['sourceMaps']),
		sourceMapFile: program['sourceMapFile'] || (out || file) + '.map',
		sourceRoot: program['sourceRoot']

	}, function (err, data) {
		if (err) {
			error(err);
		}

		if (out) {
			line();
			console.log('File "' + url(file) + '" was successfully built -> "' + url(out) + '"');
			console.timeEnd('Time');
			date();
			line();

		} else {
			console.log(data);
		}
	});
}

if (!file && input == null) {
	var
		stdin = process.stdin,
		stdout = process.stdout;

	var buf = '';
	stdin.setEncoding('utf8');
	stdin.on('data', function (chunk) {
		buf += chunk;
	});

	stdin.on('end', function () {
		action(program['file'], buf);
	}).resume();

	process.on('SIGINT', function () {
		stdout.write(eol);
		stdin.emit('end');
		stdout.write(eol);
		process.exit();
	});

} else {
	action(file || program['file'], input);
}
