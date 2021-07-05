'use strict';

/* eslint-disable eqeqeq */

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

const
	gulp = require('gulp'),
	$ = require('gulp-load-plugins')(),
	plumber = require('gulp-plumber'),
	fs = require('fs');

const
	headRgxp = /(\/\*![\s\S]*?\*\/\n{2})/;

gulp.task('build:js', () => {
	/* eslint-disable prefer-template */

	const fullHead =
		getHead(true) +
		' *\n' +
		` * Date: ${new Date().toUTCString()}\n` +
		' */\n\n';

	/* eslint-enable prefer-template */

	return gulp.src('./src/*.js', {since: gulp.lastRun('build')})
		.pipe(plumber())
		.pipe($.replace(headRgxp, ''))
		.pipe($.babel())
		.pipe($.header(fullHead))
		.pipe($.eol('\n'))
		.pipe(gulp.dest('./dist'));
});

gulp.task('build:ts', () => {
	const monic = require('./monic');
	return monic.compile('./ts-definitions/index.d.ts', {
		file: './monic.d.ts',
		saveFiles: true
	});
});

gulp.task('build', gulp.series(['build:js', test]));
gulp.task('yaspeller', () => $.run('yaspeller ./').exec().on('error', console.error));
gulp.task('test', test);

gulp.task('bump', () =>
	gulp.src('./@(package-lock|package).json')
		.pipe(plumber())
		.pipe($.bump({version: getVersion()}))
		.pipe(gulp.dest('./'))
);

gulp.task('npmignore', () =>
	gulp.src('./.npmignore')
		.pipe(plumber())
		.pipe($.replace(/([\s\S]*?)(?=# NPM ignore list)/, `${require('fs').readFileSync('./.gitignore')}\n`))
		.pipe(gulp.dest('./'))
);

gulp.task('head', () => {
	const
		fullHead = `${getHead()} */\n\n`;

	const paths = [
		'./@(src|test)/*.js',
		'./ts-definitions/*.d.ts',
		'./@(monic|gulpfile).js',
		'./bin/monic.js',
		'./monic.d.ts'
	];

	return gulp.src(paths, {base: './'})
		.pipe(plumber())
		.pipe($.ignore.include(filter))
		.pipe($.replace(headRgxp, ''))
		.pipe($.if('bin/monic.js', $.replace(/^#!.*\n{2}/, (str) => str + fullHead), $.header(fullHead)))
		.pipe(gulp.dest('./'));

	function filter(file) {
		return !headRgxp.exec(file.contents.toString()) || RegExp.$1 !== fullHead;
	}
});

gulp.task('default', gulp.parallel([
	gulp.series([
		gulp.parallel(['bump', 'head']),
		'build'
	]),

	'build:ts',
	'yaspeller',
	'npmignore'
]));

gulp.task('watch', gulp.series(['default', () => {
	gulp.watch('./src/*.js', gulp.series('build'));
	gulp.watch('./monic.js', gulp.series('bump'));
	gulp.watch(['./test/**/*', './monic.js'], gulp.series('test'));
	gulp.watch('./*.md', gulp.series('yaspeller'));
	gulp.watch('./.gitignore', gulp.series('npmignore'));
}]));

function test() {
	return $.run('node test').exec().on('error', console.error);
}

function getVersion() {
	const file = fs.readFileSync('./monic.js');
	return /VERSION\s*[:=]\s*\[(\d+,\s*\d+,\s*\d+)]/.exec(file)[1]
		.split(/\s*,\s*/)
		.join('.');
}

function getHead(opt_version) {
	return (
		'/*!\n' +
		` * Monic${opt_version ? ` v${getVersion()}` : ''}\n` +
		' * https://github.com/MonicBuilder/Monic\n' +
		' *\n' +
		' * Released under the MIT license\n' +
		' * https://github.com/MonicBuilder/Monic/blob/master/LICENSE\n'
	);
}
