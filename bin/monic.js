#!/usr/bin/env node

var monic = require('../monic'),
	program = require('commander');

var path = require('path'),
	fs = require('fs');

program
	.version(monic.VERSION.join('.'))
	.usage('[options] [file ...]')

	.option('-f, --file [src]', 'path to the file (meta-information)')
	.option('--line-separator [char]', 'the newline character')
	.option('--flags [list]', 'list of flags separated by commas')
	.option('--labels [list]', 'list of labels separated by commas')

	.parse(process.argv);

var args = program['args'],
	input;

var file = program['source'],
	out = program['output'];

if (!file && args.length) {
	input = args.join(' ');

	if (fs.existsSync(input)) {
		file = input;
		input = void 0;
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
		lineSeparator: program['lineSeparator'],
		flags: (program['flags'] || '').split(',').reduce(toObj, {}),
		labels: (program['labels'] || '').split(',').reduce(toObj, {})

	}, function (err, data) {
		if (err) {
			console.error(err.message);
			process.exit(1);
		}

		console.log(data);
	});
}

if (!file && input == null) {
	var buf = '';
	var stdin = process.stdin,
		stdout = process.stdout;

	stdin.setEncoding('utf8');
	stdin.on('data', function (chunk)  {
		buf += chunk;
	});

	stdin.on('end', function ()  {
		action(program['file'], buf);
	}).resume();

	var nl = program['lineSeparator'] || '\n';
	process.on('SIGINT', function ()  {
		stdout.write(nl);
		stdin.emit('end');
		stdout.write(nl);
		process.exit();
	});

} else {
	action(file || program['file'], input);
}
