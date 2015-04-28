#!/usr/bin/env node

var
	monic = require('../monic'),
	program = require('commander');

var
	path = require('path'),
	fs = require('fs');

program
	.version(monic.VERSION.join('.'))
	.usage('[options] [file ...]')

	.option('-f, --file [string]', 'Set a path to a file (meta-information)')
	.option('--eol [char]', 'Set a newline character')
	.option('--flags [list]', 'Set a list of flags separated by commas')
	.option('--labels [list]', 'Set a list of labels separated by commas')
	.option('-s, --source-maps [string]', '[true|false|inline]')
	.option('--source-file-name [string]', 'Set a filename of the generated file that the source map is associated with')
	.option('--source-map-name [string]', 'Set a filename of the source map')
	.option('--source-root [string]', 'Set the root from which all sources are relative')

	.parse(process.argv);

var
	args = program['args'],
	input;

var
	file = program['source'],
	out = program['output'];

if (!file && args.length) {
	input = args.join(' ');

	if (fs.existsSync(input)) {
		file = input;
		input = undefined;
	}
}

function action(file, input) {
	if (!file) {
		console.error('Invalid input data');
		process.exit(1);
	}

	function toObj(res, el) {
		res[el] = true;
		return res;
	}

	monic.compile(file, {
		content: input,
		eol: program['eol'],
		flags: (program['flags'] || '').split(',').reduce(toObj, {}),
		labels: (program['labels'] || '').split(',').reduce(toObj, {}),
		sourceMaps: program['sourceMaps'],
		sourceFileName: program['sourceFileName'],
		sourceMapName: program['sourceMapName'],
		sourceRoot: program['sourceRoot']

	}, function (err, data) {
		if (err) {
			console.error(err.message);
			process.exit(1);
		}

		console.log(data);
	});
}

if (!file && input == null) {
	var
		buf = '',
		stdin = process.stdin,
		stdout = process.stdout;

	stdin.setEncoding('utf8');
	stdin.on('data', function (chunk) {
		buf += chunk;
	});

	stdin.on('end', function () {
		action(program['file'], buf);
	}).resume();

	var eol = program['eol'] || '\n';
	process.on('SIGINT', function () {
		stdout.write(eol);
		stdin.emit('end');
		stdout.write(eol);
		process.exit();
	});

} else {
	action(file || program['file'], input);
}
