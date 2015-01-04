var gulp = require('gulp');
var es6 = require('gulp-es6-transpiler'),
	bump = require('gulp-bump'),
	eol = require('gulp-eol'),
	run = require('gulp-run');

gulp.task('yaspeller', function () {
	run('node node_modules/yaspeller/bin/cli.js ./').exec();
});

gulp.task('build', function () {
	gulp.src('./lib/*.js')
		.pipe(es6({
			disallowDuplicated: false,
			disallowUnknownReferences: false
		}))

		.pipe(eol())
		.pipe(gulp.dest('./build/'));
});

gulp.task('bump', function () {
	delete require.cache[require.resolve('./monic')];
	var v = require('./monic').VERSION.join('.');

	gulp.src('./*.json')
		.pipe(bump({version: v}))
		.pipe(eol())
		.pipe(gulp.dest('./'));
});

gulp.task('watch', function () {
	gulp.watch('./lib/*.js', ['build']);
	gulp.watch('./monic.js', ['bump']);
});

gulp.task('default', ['build', 'bump']);
