var basePath = 'tests',
	monic = require('../monic');

var fs = require('fs'),
	path = require('path'),
	nl = require('os').EOL;

if (process.argv[2]) {
	monic.compile(path.join(basePath, process.argv[2], 'test.js'), {lineSeparator: nl}, function (err, result) {
		if (err) {
			throw err;
		}

		console.log(result);
	});

} else {
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
							status = 'ok';

						if (res !== expected) {
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

						console.log(dir + ' ' + status);
					});
				}
			});
		});
	});
}
