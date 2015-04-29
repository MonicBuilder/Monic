var
	gulp = require('gulp'),
	async = require('async');

var
	babel = require('gulp-babel'),
	bump = require('gulp-bump'),
	header = require('gulp-header'),
	replace = require('gulp-replace'),
	cached = require('gulp-cached');

function getVersion() {
	delete require.cache[require.resolve('./monic')];
	return require('./monic').VERSION.join('.');
}

function getHead(opt_version) {
	return '' +
		'/*!\n' +
		' * Monic' + (opt_version ? ' v' + getVersion() : '') + '\n' +
		' * https://github.com/MonicBuilder/Monic\n' +
		' *\n' +
		' * Released under the MIT license\n' +
		' * https://github.com/MonicBuilder/Monic/blob/master/LICENSE\n';
}

var
	headRgxp = /\/\*![\s\S]*?\*\/\n{2}/;

gulp.task('copyright', function () {
	gulp.src('./LICENSE')
		.pipe(replace(/(Copyright \(c\) )(\d+)-?(\d*)/, function (sstr, intro, from, to) {
			var year = new Date().getFullYear();
			return intro + from + (to || from != year ? '-' + year : '');
		}))

		.pipe(gulp.dest('./'));
});

gulp.task('head', function (cb) {
	var fullHead =
		getHead() +
		' */\n\n';

	async.parallel([
		function (cb) {
			gulp.src('./*(lib|spec)/*.js')
				.pipe(replace(headRgxp, ''))
				.pipe(header(fullHead))
				.pipe(gulp.dest('./'))
				.on('end', cb);
		},

		function (cb) {
			gulp.src('./monic.js')
				.pipe(replace(headRgxp, ''))
				.pipe(header(fullHead))
				.pipe(gulp.dest('./'))
				.on('end', cb);
		},

		function (cb) {
			gulp.src('./bin/monic.js')
				.pipe(replace(headRgxp, ''))
				.pipe(replace(/^#!.*\n{2}/, function (sstr) {
					return sstr + fullHead;
				}))

				.pipe(gulp.dest('./bin'))
				.on('end', cb);
		}
	], cb);
});

gulp.task('build', function () {
	var fullHead =
		getHead(true) +
		' *\n' +
		' * Date: ' + new Date().toUTCString() + '\n' +
		' */\n\n';

	gulp.src('./lib/*.js')
		.pipe(cached('build'))
		.pipe(replace(headRgxp, ''))
		.pipe(babel({
			compact: false,
			auxiliaryComment: 'istanbul ignore next',
			loose: 'all',
			optional: [
				'spec.undefinedToVoid'
			]
		}))

		.pipe(header(fullHead))
		.pipe(gulp.dest('./build'));
});

gulp.task('bump', function () {
	gulp.src('./*.json')
		.pipe(bump({version: getVersion()}))
		.pipe(gulp.dest('./'));
});

gulp.task('watch', function () {
	gulp.watch('./lib/*.js', ['build']);
	gulp.watch('./monic.js', ['bump']);
});

gulp.task('default', ['copyright', 'head', 'build', 'bump']);
