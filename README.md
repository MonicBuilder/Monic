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
-h, --help                       Call help
-V, --version                    Return Monic version
-f, --file [string]              Set a path to a file (meta-information)
-o, --output-file [string]       Set a path to save the generated file
--eol [char]                     Set a newline character
--flags [list]                   Set a list of flags separated by commas
--labels [list]                  Set a list of labels separated by commas
-s, --source-maps [string]       [true|false|inline]
--source-map [string]            Set a path to save the generated source map
--source-root [string]           Set the source map root from which all sources are relative
```

### Addition

The build result will be outputed to `stdout`, so to save the file you need to take advantage of the shell, e.g.,

```bash
monic file.js --flags ie --labels escapeHTML > _file.js
```

Or we can use `--output-file-name`

```bash
monic file.js --flags ie --labels escapeHTML -o _file.js
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

**Builds a file and saves result to a new file with SourceMap**

```bash
# SourceMap will be saved as "myFile-compiled.map.js"
monic myFile.js -s -o myFile-compiled.js

# SourceMap will be saved as "myFile-map.js"
monic myFile.js -s -o myFile-compiled.js --source-map myFile-map.js

# SourceMap will be saved into "myFile-compiled.js"
monic myFile.js -s inline -o myFile-compiled.js
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

Our project has several dozen widgets. The code for each widget is in a separate file.
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

### Including chunks of files

This functionality is very useful useful for development of libraries and frameworks.
For example, in our library there is a file *String.js* containing several dozens of functions for working with strings.
Isolate each function in a separate file somehow wrong, but attach a few hundred lines of code for only one function
is also not desirable. To solve this problem Monic can can mark the file *String.js* on specific areas.
Names in areas can be arbitrary, but it is better to coincide with the names of functions.

```js
var String = {};

//#label truncate
String.truncate = function () {

};
//#endlabel truncate

//#label escapeHTML
String.escapeHTML = function () {

};
//#endlabel escapeHTML
```

Now, if we only need the `escapeHTML`, when you include a file *String.js* write

```js
//#include String.js::escapeHTML
```

As a result, the build will get only

```js
var String = {};

String.escapeHTML = function () {

};
```

If you want to include several areas, you need to write something like this

```js
//#include String.js::trim::truncate
```

If you want to include everything except the marked areas (for example, we need only String namespace), then

```js
//#include String.js::
```

If some area needed another area of the current file, use the `#include` without specifying a file.

```js
//#label truncate
//#include ::trim
String.truncate = function () {};
//#endlabel truncate
```

Please note that the marked-thus the area of the file in builded code can change the order between them and may
receive another code.

For example,

```js
//#include String.js::escapeHTML
alert(1);
//#include String.js::truncate
```

After build will receive

```js
var String = {};

String.escapeHTML = function () {

};

alert(1);

String.truncate = function () {

};
```

Therefore, don't use `#label` inside functions and expressions because it can break your JavaScript.

In addition, `#without` also watching for these areas. So, for example, `escapeHTML` can get into *common.js* and
`truncate` into *feature.js*.

## [License](https://github.com/MonicBuilder/Monic/blob/master/LICENSE)

The MIT License.
