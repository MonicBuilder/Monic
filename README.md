Monic
=====

Monic is a JavaScript file builder ([fork of Jossy](https://github.com/Kolyaj/Jossy)) to one or several files.
When it used properly, allows not only easy to build modules but also easy to rebuild them when changing the principles
of the build.

[Russian documentation](https://github.com/MonicBuilder/Monic/blob/master/README.ru.md)

[![NPM version](http://img.shields.io/npm/v/monic.svg?style=flat)](http://badge.fury.io/js/monic)
[![NPM dependencies](http://img.shields.io/david/MonicBuilder/Monic.svg?style=flat)](https://david-dm.org/MonicBuilder/Monic#info=dependencies&view=table)
[![NPM devDependencies](http://img.shields.io/david/dev/MonicBuilder/Monic.svg?style=flat)](https://david-dm.org/MonicBuilder/Monic#info=devDependencies&view=table)
[![Build Status](http://img.shields.io/travis/MonicBuilder/Monic.svg?style=flat&branch=master)](https://travis-ci.org/MonicBuilder/Monic)
[![Coverage Status](http://img.shields.io/coveralls/MonicBuilder/Monic.svg?style=flat)](https://coveralls.io/r/MonicBuilder/Monic?branch=master)

## Install

```bash
npm install monic --global
```

## Plugins

* [Gulp](https://github.com/MonicBuilder/gulp-monic)
* [Grunt](https://github.com/MonicBuilder/grunt-monic)

## Using CLI

```bash
monic [options] [file ...]
```

### options

```bash
-h, --help               Call help
-V, --version            Return Monic version
-f, --file [src]         Set a path to a file (meta-information)
--line-separator         Set a newline character (EOL)
--flags [list]           Set a list of flags separated by commas
--labels [list]          Set a list of labels separated by commas
```

### Addition

The build result will be outputed to `stdout`, so to save the file you need to take advantage of the shell, e.g.,

```bash
monic file.js --flags ie --labels escapeHTML > _file.js
```

### Examples

**Builds a file and returns the result to `stdout`**

```bash
monic myFile.js
```

**Builds a file and saves result to a new file**

```bash
monic myFile.js > myNewFile.js
```

**Builds a text and returns the result to `stdout`**

```bash
monic '//#include foo/*.js' -f myFile.js
```

**Over `stdio`**

```bash
echo '//#include foo/*.js' | monic -f myFile.js
```

## Using in NodeJS

```js
var monic = require('monic');
monic.compile(
	'myFile.js',

	{
		// EOL (optional, by default \n)
		lineSeparator: '\r\n',

		// A map of labels (optional)
		labels: {
			escapeHTML: true
		},

		// A map of flags (optional)
		flags: {
			ie: true
		}
	},

	function (err, result) {
		if (err) {
			throw err;
		}

		console.log(result);
	}
);
```

### Building from a string

```js
var monic = require('monic');
monic.compile(
	'myFile.js',

	{
		content: '...'
	},

	function (err, result) {
		...
	}
);
```

### Using replacers

```js
var monic = require('monic');
monic.compile(
	'myFile.js',

	{
		replacers: [
			// Replaces require to #include
			function (text, file) {
				return text.replace(/^\s*require\('(.*?)'\);/gm, '//#include $1');
			}
		]
	},

	function (err, result) {
		...
	}
);
```
