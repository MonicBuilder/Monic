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
	through = require('through2'),
	fs = require('fs');

const
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

function error(cb) {
	return function (err) {
		console.error(err.message);
		cb();
	};
}

const
	headRgxp = /(\/\*![\s\S]*?\*\/\n{2})/;

var
	readyToWatcher = null;

gulp.task('copyright', function (cb) {
	gulp.src('./LICENSE')
		.pipe(replace(/(Copyright \(c\) )(\d+)-?(\d*)/, function (sstr, intro, from, to) {
			const year = new Date().getFullYear();
			return intro + from + (to || from != year ? '-' + year : '');
		}))

		.pipe(gulp.dest('./'))
		.on('end', cb);
});

gulp.task('head', function (cb) {
	readyToWatcher = false;
	const fullHead =
		getHead() +
		' */\n\n';

	function test() {
		return through.obj(function (file, enc, cb) {
			if (!headRgxp.exec(file.contents.toString()) || RegExp.$1 !== fullHead) {
				this.push(file);
			}

			return cb();
		});
	}

	async.parallel([
		function (cb) {
			gulp.src(['./@(lib|test)/*.js', './@(monic|gulpfile).js'], {base: './'})
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
	const fullHead =
		getHead(true) +
		' *\n' +
		' * Date: ' + new Date().toUTCString() + '\n' +
		' */\n\n';

	gulp.src('./lib/*.js')
		.pipe(cached('build'))
		.pipe(replace(headRgxp, ''))
		.pipe(babel({
			compact: false,
			auxiliaryCommentBefore: 'istanbul ignore next',
			loose: 'all',
			optional: [
				'spec.undefinedToVoid'
			]
		}))

		.on('error', error(cb))
		.pipe(header(fullHead))
		.pipe(gulp.dest('./dist'))
		.on('end', cb);
});

gulp.task('bump', function (cb) {
	gulp.src('./*.json')
		.pipe(bump({version: getVersion()}))
		.pipe(gulp.dest('./'))
		.on('end', cb);
});

gulp.task('npmignore', function (cb) {
	gulp.src('./.npmignore')
		.pipe(replace(/([\s\S]*?)(?=# NPM ignore list)/, fs.readFileSync('./.gitignore') + '\n'))
		.pipe(gulp.dest('./'))
		.on('end', cb);
});

function test(cb) {
	run('node test').exec()
		.on('error', error(cb))
		.on('finish', cb);
}

gulp.task('full-build', ['build'], test);
gulp.task('test', test);
gulp.task('yaspeller', function (cb) {
	run('yaspeller ./').exec()
		.on('error', error(cb))
		.on('finish', cb);
});

gulp.task('watch', ['default'], function () {
	function unbind(name) {
		return function (e) {
			if (e.type === 'deleted') {
				delete cached.caches[name][e.path];
			}
		};
	}

	async.whilst(
		function () {
			return readyToWatcher === false;
		},

		function (cb) {
			setTimeout(cb, 500);
		},

		function () {
			gulp.watch('./lib/*.js', ['full-build']).on('change', unbind('build'));
			gulp.watch('./monic.js', ['bump']);
			gulp.watch(['./test/**/*', './monic.js'], ['test']);
			gulp.watch('./*.md', ['yaspeller']);
			gulp.watch('./.gitignore', ['npmignore']);
		}

	);
});

gulp.task('default', ['copyright', 'head', 'full-build', 'bump', 'yaspeller', 'npmignore']);
