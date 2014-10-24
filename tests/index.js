var __NEJS_THIS__ = this;
var basePath = 'tests';
var builder = require('../builder');

var fs = require('fs');
var path = require('path');

if (process.argv[2]) {
	builder.compile(path.join(basePath, process.argv[2], 'test.js'), [], {}, function (err, result) {
		
		if (err) {
			throw err;
		}

		console.log(result);
	});

} else {
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
					builder.compile(path.join(dirPath, 'test.js'), [], {}, function (err, builderResult) {
						
						if (err) {
							throw err;
						}

						fs.readFile(path.join(dirPath, 'result.js'), 'utf8', function (err, result) {
							
							if (err) {
								throw err;
							}

							var status = builderResult.replace(/\r/g, '').trim() ===
								result.replace(/\r/g, '').trim() ?
									'ok' : 'fail';

							console.log(dir + ' ' + status);
						});
					});
				}
			});
		});
	});
}
