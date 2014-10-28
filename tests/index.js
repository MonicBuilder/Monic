var basePath = 'tests',
	monic = require('../monic');

var fs = require('fs'),
	path = require('path'),
	nl = require('os').EOL;

var logPath = path.join(__dirname, 'error.txt'),
	log = '';

if (fs.existsSync(logPath)) {
	fs.unlinkSync(logPath);
}

fs.readdir(basePath, function (err, dirs) {
	if (err) {
		throw err;
	}

	dirs.forEach(function (dir) {
		var dirPath = path.join(basePath, dir);

		fs.stat(dirPath, function (err, stat) {
			if (err) {
				throw err;
			}

			if (stat.isDirectory()) {
				monic.compile(path.join(dirPath, 'test.js'), {lineSeparator: nl}, function (err, res) {
					if (err) {
						throw err;
					}

					res = res.trim();
					var expected = fs.readFileSync(path.join(dirPath, 'result.js')).toString().trim(),
						status = 'ok',
						error = res !== expected;

					if (error) {
						status = 'fail';

						if (log) {
							log += '~~~~~~~~~~~~~~\n\n';
						}

						log += 'Test: ' + dir + '\n\nResult:\n' + res + '\n\nExpected:\n' + expected;

						fs.writeFileSync(
							logPath,
							log
						);
					}

					console[error ? 'error' : 'log'](dir + ' - ' + status);

					if (error) {
						process.exit(1);
					}
				});
			}
		});
	});
});
