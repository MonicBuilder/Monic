Monic
=====

Monic is a JavaScript file builder ([fork of Jossy](https://github.com/Kolyaj/Jossy)) to one or several files.
When it used properly, Monic allows not only easy to build modules, but also easy to rebuild them, when changing principles
of the build.

[:ru: Russian documentation](https://github.com/MonicBuilder/Monic/blob/master/README.ru.md)

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
* [WebPack](https://github.com/MonicBuilder/monic-loader)

## Using CLI

```bash
monic [options] [file ...]
```

### options

```
-h, --help
-V, --version
-f, --file [string]          path to the source file (meta information)
-o, --output [string]        path to the output file
--eol [char]                 EOL symbol
--flags [list]               list of flags separated by commas
--labels [list]              list of labels separated by commas
-s, --source-maps [string]   [true|false|inline]
--source-map-file [string]   path to the generated source map
--source-root [string]       root for all URLs inside the generated source map
```

### Addition

The build result will be output to `stdout`, so to save it to a file you need use your shell, e.g.,

```bash
monic file.js --flags ie --labels escapeHTML > _file.js
```

Or you can use `--output`

```bash
monic file.js --flags ie --labels escapeHTML -o _file.js
```

### Examples

**Builds a file and output to stdout**

```bash
monic myFile.js
```

**Builds a file and saves the result to a new file**

```bash
monic myFile.js > myNewFile.js
```

**Builds a file and saves the result to a new file with SourceMap**

```bash
# SourceMap will be saved as "myFile-compiled.map.js"
monic myFile.js -s -o myFile-compiled.js

# SourceMap will be saved as "myFile-map.js"
monic myFile.js -s -o myFile-compiled.js --source-map myFile-map.js

# SourceMap will be saved into "myFile-compiled.js"
monic myFile.js -s inline -o myFile-compiled.js
```

**Builds a text and output to stdout**

```bash
monic '//#include foo/*.js' -f myFile.js
```

**Over stdio**

```bash
echo '//#include foo/*.js' | monic -f myFile.js
```

## Using in NodeJS

```js
var monic = require('monic');
monic.compile(
  'myFile.js',

  {
    // The path to the working directory
    // (optional, by default module.parent)
    cwd: 'myDir/',

    // EOL symbol (optional, by default \n)
    eol: '\r\n',

    // The map of Monic labels (optional)
    labels: {
      escapeHTML: true
    },

    // The map of Monic flags (optional)
    flags: {
      ie: true
    },

    // If is true, then generated files will be saved
    // (optional, by default false)
    saveFiles: true,

    // The path to the generated file (optional)
    file: 'myFiled-compiled.js',

    // If is true or 'inline', then will be generated a source map
    // (optional, by default false)
    sourceMaps: true,

    // The base source map object for the output source map
    // (optional)
    inputSourceMap: null,

    // The path to the generated source map (optional, by default ${file}.map)
    sourceMapFile: 'myFiled.map',

    // The root for all URLs in the generated source map (optional)
    sourceRoot: 'myDir/'
  },

  function (err, data, {map, decl, url, isExternal}) {
    if (err) {
      throw err;
    }

    console.log(data);
  }
);
```

### Using Promise API ([When](https://www.npmjs.com/package/when))

```js
var monic = require('monic');
monic.compile('myFile.js')
  .then(function ([data, {map, decl, url, isExternal}]) {
    ...
  })

  .catch(function (err) {
    ...
  });
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
      // ("this" refers to the instance of the compiler)
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
However, if the specified file is already included to the current module before, then it won't be included again.
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

Our project has several dozen widgets. The code for each widget is inside a separate file.
Each widget indicated its dependence with the `#include`.
Some widgets are used on most pages, and is logical to place their code in a separate file, for example *common.js*.
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
Most importantly don't forget to include to a page not only the *feature.js*, but the *common.js* too.

The path format in the directive is the same as in the `#include`.

### Conditional build

In the build process can be defined special flags that define whether or not to include selected code sections.

```js
//#set flag

//#if flag
alert('flag');
/*? Or //#end if */
//#endif

//#unset flag

//#unless flag
alert('not flag');
/*? Or //#end unless */
//#endunless
```

Flags can take values.

```js
//#set ie 7

//#if ie = 7
alert('OMG!');
//#endif

//#unless ie = 7
alert('Cool!');
//#endunless
```

More examples:

```js
//#set foo

//#if foo
alert('foo');
//#endif

//#unset foo

//#unless foo
alert('foo !=');
//#endunless

//#set ie 7

//#if ie = 7
alert('ie = 7');
//#endif

//#if ie != 8
alert('ie != 8');
//#endif

//#if ie > 6
alert('ie > 6');
//#endif

//#if ie >= 7
alert('ie >= 7');
//#endif

//#if ie < 8
alert('ie < 8');
//#endif

//#if ie <= 7
alert('ie <= 7');
//#endif
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

#### Using the flags inside path patterns

The flags that were specified as a build parameter or in the global scope of a file can be used inside
`#include` and `#without` with using a special syntax.

```js
//#set lang en
//#include lang/${lang}.json
```

If the flag doesn't exist, then will be inserted an empty string.

### Including chunks of files

This functionality is very useful for development of libraries and frameworks.
For example, in your library there is a file *String.js* containing several dozens of functions for working with strings.
Isolate each function in a separate file somehow wrong, but attach a few hundred lines of code for only one function
is also not desirable. To solve this problem Monic can can mark the file *String.js* on specific areas.
Names in areas can be arbitrary, but it is better to coincide with the names of functions.

```js
var String = {};

//#label truncate
String.truncate = function () {

};
/*? Or //#end label */
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

Please note that the marked-thus the area of the file in built code can change the order between them and may
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
