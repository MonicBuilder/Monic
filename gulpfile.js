var
	gulp = require('gulp');

var
	babel = require('gulp-babel'),
	bump = require('gulp-bump');

gulp.task('build', function () {
	gulp.src('./lib/*.js')
		.pipe(babel({
			loose: 'all'
		}))
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
