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

## The syntax and capabilities
### Including files

To include an external file into the current need to use the `#include` directive.

```js
//#include file.js
```

The file path is relative to the location of the current file, but also you can use an absolute path.
In the file path can also be used [templates](https://github.com/isaacs/node-glob).

```js
//#include lib/*.js
```

Technically, the line with the directive is simply replaced to a text of the attached file.
However, if the specified file is already included in the current module before, then it won't be included again.
For example,

**f1.js**

```js
alert(1);
```

**f2.js**

```js
//#include f1.js
alert(2);
```

**f3.js**

```js
//#include f1.js
//#include f2.js
```

**Build f3.js**

```bash
monic f3.js > result.js
```

**result.js**

```js
alert(1);
alert(2);
```

### Excluding files

The `#without` indicates Monic exclude from the build all the files that are used in the specified
(including specified, of course).

**Example**

The project has several dozen widgets. The code for each widget is in a separate file.
Each widget indicated its dependence with the `#include`.
Some widgets are used on most pages, and is logical to place their code in a separate file *common.js*.
Select frequently-used widgets, create the file *common.js* and write back:

```js
//#include widget1.js
//#include widget2.js
//#include widget3.js
```

On one of the pages the widget is used, large enough not to include it in the *common.js*,
let's call it *big widget*. In the file *big-widget.js* its dependencies, and many of those who
already in the *common.js*. If we will simply build the *big-widget.js* we will get a lot of duplicated code.
Therefore, next to the *common.js* create a file *feature.js* with the code:

```js
//#without common.js
//#include big-widget.js
```

Now the code in the *common.js*, misses the *feature.js*.
Most importantly don't forget to connect to a page not only the *feature.js*, but the *common.js* too.

The path format in the directive is the same as in the `#include`.

### Conditional build

In the build process can be defined boolean flags that define whether or not to include selected sections of code.

```js
//#set flag

//#if flag
alert('flag');
//#endif

//#if not flag
alert('not flag');
//#endif

//#unset flag
```

All the flags are declared globally. To set them in your code, you should use the directives `#set` and `#unset`,
and also you can specify them when you run Monic. For example,

**file.js**

```js
//#if ie
alert('IE only');
//#endif
```

**common.js**

```js
//#include file.js
```

**common-ie.js**

```js
//#set ie
//#include file.js
```

Similarly, you can create a debug flag and write debug code within `//#if debug ... //#endif`,
that code never gets to production server.
