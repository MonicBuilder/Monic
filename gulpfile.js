var
	gulp = require('gulp');

var
	babel = require('gulp-babel'),
	bump = require('gulp-bump'),
	header = require('gulp-header');

function getVersion() {
	delete require.cache[require.resolve('./monic')];
	return require('./monic').VERSION.join('.');
}

gulp.task('build', function () {
	var head =
		'/*!\n' +
		' * Monic v' + getVersion() + '\n' +
		' * https://github.com/MonicBuilder/Monic\n' +
		' *\n' +
		' * Released under the MIT license\n' +
		' * https://github.com/MonicBuilder/Monic/blob/master/LICENSE\n' +
		' *\n' +
		' * Date: ' + new Date().toUTCString() + '\n' +
		' */\n\n';

	gulp.src('./lib/*.js')
		.pipe(babel({
			compact: false,
			highlightCode: false,
			auxiliaryComment: 'istanbul ignore next',
			loose: 'all',
			optional: [
				'spec.undefinedToVoid'
			]
		}))

		.pipe(header(head))
		.pipe(gulp.dest('./build/'));
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

gulp.task('default', ['build', 'bump']);
