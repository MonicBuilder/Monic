var gulp = require('gulp');
var es6 = require('gulp-es6-transpiler'),
	rename = require('gulp-rename'),
	bump = require('gulp-bump');

gulp.task('es6-transpiler', function () {
	gulp.src('./lib/*.es6')
		.pipe(rename(function (path) {
			path.extname = '.js';
		}))

		.pipe(es6({disallowUnknownReferences: false}))
		.pipe(gulp.dest('./build/'));
});

gulp.task('bump', function () {
	delete require.cache[require.resolve('./monic')];
	var v = require('./monic').VERSION.join('.');

	gulp.src('./*.json')
		.pipe(bump({version: v}))
		.pipe(gulp.dest('./'));
});

gulp.task('watch', function () {
	gulp.watch('./lib/*.es6', ['es6-transpiler', 'bump']);
});

gulp.task('default', ['es6-transpiler', 'bump', 'watch']);
