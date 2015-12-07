/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

var
	fs = require('fs'),
	path = require('path'),
	$C = require('collection.js').$C,
	eol = '\n';

var
	basePath = __dirname.split(path.sep).slice(-1).join(),
	monic = require('../');

var
	logPath = path.join(__dirname, 'error.txt'),
	log = '';

if (fs.existsSync(logPath)) {
	fs.unlinkSync(logPath);
}

fs.readdir(basePath, function (err, dirs) {
	if (err) {
		throw err;
	}

	$C(dirs).forEach(function (dir) {
		var dirPath = path.resolve(basePath, dir);

		fs.stat(dirPath, function (err, stat) {
			if (err) {
				throw err;
			}

			if (stat.isDirectory()) {
				function test(res) {
					res = res.trim();
					const
						expected = fs.readFileSync(path.join(dirPath, 'result.js')).toString().trim(),
						error = res !== expected;

					var
						status = 'ok';

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
				}

				function promiseTest(res) {
					test(res[0]);
				}

				function cbTest(err, res) {
					if (err) {
						throw err;
					}

					test(res);
				}

				const src = path.join(dirPath, 'test.js');
				const replacers = [
					function (text) {
						return text.replace(/^\s*require\('(.*?)'\);/gm, '//#include $1');
					}
				];

				monic.compile(src, {
					eol: eol,
					replacers: replacers
				}).then(promiseTest, cbTest);

				monic.compile(src, {
					eol: eol,
					replacers: replacers
				}, cbTest);

				monic.compile(src, {
					eol: eol,
					replacers: replacers,
					content: String(fs.readFileSync(src))
				}, cbTest);
			}
		});
	});
});
