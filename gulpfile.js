var
	gulp = require('gulp'),
	async = require('async'),
	through = require('through2');

var
	babel = require('gulp-babel'),
	bump = require('gulp-bump'),
	header = require('gulp-header'),
	replace = require('gulp-replace'),
	cached = require('gulp-cached'),
	run = require('gulp-run');

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
	headRgxp = /(\/\*![\s\S]*?\*\/\n{2})/,
	readyToWatcher = false;

gulp.task('copyright', function (cb) {
	gulp.src('./LICENSE')
		.pipe(replace(/(Copyright \(c\) )(\d+)-?(\d*)/, function (sstr, intro, from, to) {
			var year = new Date().getFullYear();
			return intro + from + (to || from != year ? '-' + year : '');
		}))

		.pipe(gulp.dest('./'))
		.on('end', cb);
});

gulp.task('head', function (cb) {
	var fullHead =
		getHead() +
		' */\n\n';

	function test() {
		return through.obj(function (file, enc, cb) {
			if (headRgxp.exec(file.contents.toString()) && RegExp.$1 !== fullHead) {
				this.push(file);
			}

			return cb();
		})
	}

	async.parallel([
		function (cb) {
			gulp.src(['./@(lib|spec)/*.js', './monic.js'], {base: './'})
				.pipe(test())
				.pipe(replace(headRgxp, ''))
				.pipe(header(fullHead))
				.pipe(gulp.dest('./'))
				.on('end', cb);
		},

		function (cb) {
			gulp.src('./bin/monic.js')
				.pipe(test())
				.pipe(replace(headRgxp, ''))
				.pipe(replace(/^#!.*\n{2}/, function (sstr) {
					return sstr + fullHead;
				}))

				.pipe(gulp.dest('./bin'))
				.on('end', cb);
		}
	], function () {
		readyToWatcher = true;
		cb();
	});
});

gulp.task('build', function (cb) {
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

		.on('error', function (err) {
			console.error(err.message);
			cb();
		})

		.pipe(header(fullHead))
		.pipe(gulp.dest('./build'))
		.on('end', cb);
});

gulp.task('bump', function (cb) {
	gulp.src('./*.json')
		.pipe(bump({version: getVersion()}))
		.pipe(gulp.dest('./'))
		.on('end', cb);
});

function test(cb) {
	run('node spec').exec()
		.on('error', function (err) {
			console.error(err.message);
			cb();
		})

		.on('finish', cb);
}

gulp.task('full-build', ['build'], test);
gulp.task('test', test);

gulp.task('watch', function () {
	async.whilst(
		function () {
			return !readyToWatcher;
		},

		function (cb) {
			setTimeout(cb, 500);
		},

		function () {
			gulp.watch('./lib/*.js', ['full-build']);
			gulp.watch('./monic.js', ['bump']);
			gulp.watch(['./spec/**/*', './monic.js'], ['test']);
		}
	);
});

gulp.task('default', ['copyright', 'head', 'full-build', 'bump']);
