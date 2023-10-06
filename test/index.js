'use strict';

/*!
 * Monic
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 */

const
	$C = require('collection.js/compiled'),
	monic = require('../');

const
	fs = require('fs'),
	path = require('path'),
	eol = '\n';

const
	logPath = path.join(__dirname, 'error.txt'),
	basePath = __dirname.split(path.sep).slice(-1).join();

if (fs.existsSync(logPath)) {
	fs.unlinkSync(logPath);
}

let log = '';
$C(fs.readdirSync(basePath)).forEach((dir) => {
	const
		dirPath = path.resolve(basePath, dir),
		stat = fs.statSync(dirPath);

	if (stat.isDirectory()) {
		const test = (res) => {
			res = res.trim();

			const
				expected = fs.readFileSync(path.join(dirPath, 'result.js')).toString().trim(),
				error = res !== expected;

			let
				status = 'ok';

			if (error) {
				status = 'fail';

				if (log) {
					log += '~~~~~~~~~~~~~~\n\n';
				}

				log += `Test: ${dir}\n\nResult:\n${res}\n\nExpected:\n${expected}`;
				fs.writeFileSync(logPath, log);
			}

			console[error ? 'error' : 'log'](`${dir} - ${status}`);
			error && process.exit(1);
		};

		const promiseTest = (obj) => {
			test(obj.result);
		};

		const cbTest = (err, res) => {
			if (err) {
				console.error(err);
				throw err;
			}

			test(res);
		};

		const
			src = path.join(dirPath, 'test.js'),
			replacers = [(text) => text.replace(/^\s*require\('(.*?)'\);/gm, '//#include $1')];

		monic.compile(src, {eol, replacers}).then(promiseTest, cbTest);
		monic.compile(src, {eol, replacers}, cbTest);
		monic.compile(src, {eol, replacers, content: String(fs.readFileSync(src))}, cbTest);
	}
});
