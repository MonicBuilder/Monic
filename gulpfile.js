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
	async = require('async'),
	fs = require('fs');

const
	plumber = require('gulp-plumber'),
	header = require('gulp-header'),
	replace = require('gulp-replace'),
	cached = require('gulp-cached'),
	eol = require('gulp-eol'),
	run = require('gulp-run');

function getVersion() {
	const file = fs.readFileSync('./monic.js');
	return /VERSION\s*(?::|=)\s*\[(\d+,\s*\d+,\s*\d+)]/.exec(file)[1]
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

const
	headRgxp = /(\/\*![\s\S]*?\*\/\n{2})/;

let
	readyToWatcher = null;

gulp.task('copyright', (cb) => {
	gulp.src('./LICENSE')
		.pipe(replace(/(Copyright \(c\) )(\d+)-?(\d*)/, (sstr, intro, from, to) => {
			const year = new Date().getFullYear();
			return intro + from + (to || from != year ? `-${year}` : '');
		}))

		.pipe(gulp.dest('./'))
		.on('end', cb);
});

gulp.task('head', (cb) => {
	readyToWatcher = false;

	const
		through = require('through2'),
		fullHead = `${getHead()} */\n\n`;

	function test() {
		return through.obj(function (file, enc, cb) {
			if (!headRgxp.exec(file.contents.toString()) || RegExp.$1 !== fullHead) {
				this.push(file);
			}

			return cb();
		});
	}

	async.parallel([
		(cb) => {
			gulp.src(['./@(src|test)/*.js', './@(monic|gulpfile).js'], {base: './'})
				.pipe(test())
				.pipe(replace(headRgxp, ''))
				.pipe(header(fullHead))
				.pipe(gulp.dest('./'))
				.on('end', cb);
		},

		(cb) => {
			gulp.src('./bin/monic.js')
				.pipe(test())
				.pipe(replace(headRgxp, ''))
				.pipe(replace(/^#!.*\n{2}/, (sstr) => sstr + fullHead))
				.pipe(gulp.dest('./bin'))
				.on('end', cb);
		}

	], () => {
		readyToWatcher = true;
		cb();
	});
});

gulp.task('build', ['bump'], (cb) => {
	const
		babel = require('gulp-babel');

	/* eslint-disable prefer-template */

	const fullHead =
		getHead(true) +
		' *\n' +
		` * Date: ${new Date().toUTCString()}\n` +
		' */\n\n';

	/* eslint-enable prefer-template */

	gulp.src('./src/*.js')
		.pipe(plumber())
		.pipe(cached('build'))
		.pipe(replace(headRgxp, ''))
		.pipe(babel())
		.pipe(header(fullHead))
		.pipe(eol('\n'))
		.pipe(gulp.dest('./dist'))
		.on('end', cb);
});

gulp.task('bump', (cb) => {
	const
		bump = require('gulp-bump');

	gulp.src('./package.json')
		.pipe(bump({version: getVersion()}))
		.pipe(gulp.dest('./'))
		.on('end', cb);
});

gulp.task('npmignore', (cb) => {
	gulp.src('./.npmignore')
		.pipe(replace(/([\s\S]*?)(?=# NPM ignore list)/, `${fs.readFileSync('./.gitignore')}\n`))
		.pipe(gulp.dest('./'))
		.on('end', cb);
});

function test(cb) {
	run('node test').exec()
		.pipe(plumber())
		.on('finish', cb);
}

gulp.task('fullBuild', ['build'], test);
gulp.task('test', test);
gulp.task('yaspeller', (cb) => {
	run('yaspeller ./').exec()
		.pipe(plumber())
		.on('finish', cb);
});

gulp.task('watch', ['default'], () => {
	async.whilst(
		() =>
			readyToWatcher === false,

		(cb) =>
			setTimeout(cb, 500),

		() => {
			gulp.watch('./src/*.js', ['fullBuild']).on('change', unbind('build'));
			gulp.watch('./monic.js', ['bump']);
			gulp.watch(['./test/**/*', './monic.js'], ['test']);
			gulp.watch('./*.md', ['yaspeller']);
			gulp.watch('./.gitignore', ['npmignore']);
		}
	);

	function unbind(name) {
		return (e) => {
			if (e.type === 'deleted') {
				delete cached.caches[name][e.path];
			}
		};
	}
});

gulp.task('default', ['copyright', 'head', 'fullBuild', 'yaspeller', 'npmignore']);
