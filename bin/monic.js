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
	.option('-o, --output-file [string]', 'Set a path to save the generated file')

	.option('--eol [char]', 'Set a newline character')
	.option('--flags [list]', 'Set a list of flags separated by commas')
	.option('--labels [list]', 'Set a list of labels separated by commas')
	.option('-s, --source-maps [string]', '[true|false|inline]')
	.option('--source-map [string]', 'Set a path to save the generated source map')
	.option('--source-root [string]', 'Set the source map root from which all sources are relative')

	.parse(process.argv);

var
	args = program['args'],
	input;

var
	file = program['file'],
	out = program['outputFile'],
	root = process.cwd();

if (!file && args.length) {
	input = args.join(' ');

	if (fs.existsSync(input)) {
		file = input;
		input = undefined;
	}
}

function action(file, input) {
	console.time('Time');

	if (!file) {
		line(true);
		console.error('Invalid input data');
		line(true);
		process.exit(1);
	}

	function toObj(res, el) {
		res[el] = true;
		return res;
	}

	function line(opt_error) {
		console[opt_error ? 'error' : 'log'](new Array(80).join(opt_error ? '!' : '~'));
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
		root: root,
		content: input,
		eol: program['eol'],
		flags: (program['flags'] || '').split(',').reduce(toObj, {}),
		labels: (program['labels'] || '').split(',').reduce(toObj, {}),
		file: out,
		sourceMaps: parse(program['sourceMaps']),
		sourceMap: program['sourceMap'] || (out || file) + '.map',
		sourceRoot: program['sourceRoot']

	}, function (err, data) {
		if (err) {
			line(true);
			console.error(err.message);
			line(true);
			process.exit(1);
		}

		if (out) {
			var
				from = path.normalize(path.relative(root, path.resolve(file))),
				to = path.normalize(path.relative(root, path.resolve(out)));

			line();
			console.log('File "' + from + '" has been successfully builded "' + to + '".');
			console.timeEnd('Time');
			line();

		} else {
			console.log(data);
		}
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
