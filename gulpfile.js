// https://github.com/termi/es6-transpiler/issues/66
String.prototype.contains = String.prototype.contains || function (str, opt_pos) {
	return String.prototype.indexOf.apply(this, arguments) !== -1;
};

var gulp = require('gulp');
var es6 = require('gulp-es6-transpiler'),
	bump = require('gulp-bump');

gulp.task('build', function () {
	gulp.src('./lib/*.js')
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
	gulp.watch('./lib/*.js', ['build']);
	gulp.watch('./monic.js', ['bump']);
});

gulp.task('default', ['build', 'bump']);
