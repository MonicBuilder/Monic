var gulp = require('gulp');
var es6 = require('gulp-es6-transpiler'),
	bump = require('gulp-bump');

gulp.task('build', function () {
	gulp.src('./src/*.js')
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
	gulp.watch('./src/*.es6', ['build', 'bump']);
});

gulp.task('default', ['build', 'bump']);
