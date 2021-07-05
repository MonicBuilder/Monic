Monic
=====

Monic is a JavaScript file builder ([fork of Jossy](https://github.com/Kolyaj/Jossy)) to one or several files.
When used properly, Monic allows not only easy to build modules but also easy to rebuild when changing principles
of the build.

[Russian documentation](https://github.com/MonicBuilder/Monic/blob/master/README.ru.md)

[![NPM version](http://img.shields.io/npm/v/monic.svg?style=flat)](http://badge.fury.io/js/monic)
[![NPM dependencies](http://img.shields.io/david/MonicBuilder/Monic.svg?style=flat)](https://david-dm.org/MonicBuilder/Monic)
[![NPM devDependencies](http://img.shields.io/david/dev/MonicBuilder/Monic.svg?style=flat)](https://david-dm.org/MonicBuilder/Monic?type=dev)
[![Build Status](https://github.com/MonicBuilder/Monic/workflows/build/badge.svg?branch=master)](https://github.com/MonicBuilder/Monic/actions?query=workflow%3Abuild)
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
-f, --file [src]             path to the source file (meta information)
-o, --output [src]           path to the output file
--eol [char]                 symbol that will be used as EOL
--flags [list]               list of flags separated by commas
--labels [list]              list of labels separated by commas
-s, --source-maps [val]      [true|false|inline]
--source-map-file [src]      path to the generated source map
--source-root [path]         root for all URLs inside the generated source map
```

### Addition

The build result will be output to `stdout`. To save it to a file, you need to use your shell, e.g.,

```bash
monic file.js --flags ie --labels escapeHTML > _file.js
```

Or you can use `--output`

```bash
monic file.js --flags ie --labels escapeHTML -o _file.js
```

### Examples

**Builds a file and outputs to stdout**

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

**Builds a text and outputs to stdout**

```bash
monic '//#include foo/*.js' -f myFile.js
```

**Over stdio**

```bash
echo '//#include foo/*.js' | monic -f myFile.js
```

## Using as a library

```js
var monic = require('monic');
monic.compile(
  'myFile.js',

  {
    // A path to the working directory
    // (optional, by default `module.parent`)
    cwd: 'myDir/',

    // A symbol that will be used as EOL (optional, by default `\n`)
    eol: '\r\n',

    // A map of Monic labels (optional)
    labels: {
      escapeHTML: true
    },

    // A map of Monic flags (optional).
    // The flags can have different values, for instance
    flags: {
      ie: true,
      ieVersions: [7, 8, 9],
      needInclude({flags}) {
        return flags.ie && flags.ieVersions.includes(7);
      }
    },

    // If is `true`, then the generated files will be saved
    // (optional, by default false)
    saveFiles: true,

    // A path to the generated file (optional)
    file: 'myFiled-compiled.js',

    // If is `true` or `'inline'`, then will be generated a source map
    // (optional, by default `false`)
    sourceMaps: true,

    // A base source map object for the output source map
    // (optional)
    inputSourceMap: null,

    // A path to the generated source map (optional, by default `${file}.map`)
    sourceMapFile: 'myFiled.map',

    // A root for all URL-s within the generated source map (optional)
    sourceRoot: 'myDir/'
  },

  (err, result, {map, decl, url, isExternal}) => {
    if (err) {
      throw err;
    }

    console.log(result);
  }
);
```

### Using Promise API

```js
var monic = require('monic');
monic.compile('myFile.js')
  .then(({result, sourceMap: {map, decl, url, isExternal}}) => {
    // ...
  })

  .catch((err) => {
    // ...
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

  (err, result) => {
    // ...
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
      // Replaces all require expressions to `#include` directives
      // ("this" refers to the compiler' instance)
      (text, file) => text.replace(/^\s*require\('(.*?)'\);/gm, '//#include $1')
    ]
  },

  (err, result) => {
    // ...
  }
);
```

## The syntax and capabilities

### Including files

To include an external file into the current need to use the `#include` directive.

```js
//#include file.js
```

A file path is relative to the current file's location, but you can also use an absolute path.
Within the path can also be used [templates](https://github.com/isaacs/node-glob).

```js
//#include lib/*.js
```

Technically, the line with the directive is simply replaced with a text of the attached file.
However, if the specified file is already included in the current module, it won't be included again.
For example:

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

**An example**

Our project has several dozen widgets. The code for each widget is inside a separate file.
Each widget indicated its dependence on the `#include`.
Some widgets are used on most pages, and it is logical to place their code in a separate file, for example, *common.js*.
Select frequently-used widgets, create the file *common.js* and write back:

```js
//#include widget1.js
//#include widget2.js
//#include widget3.js
```

The widget is used on one of the pages, large enough not to include it in the *common.js*,
let's call it *big widget*. In the file *big-widget.js*, its dependencies, many of those
already in the *common.js*. If we build the *big-widget.js*, we will get a lot of duplicated code.
Therefore, next to the *common.js*, create a file *feature.js* with the code:

```js
//#without common.js
//#include big-widget.js
```

Now the code in the *common.js* misses the *feature.js*.
Most importantly, don't forget to include to a page not only the *feature.js*, but the *common.js* too.

The path format in the directive is the same as in the `#include`.

### Conditional build

In the build process can be defined special flags that determine whether or not to include selected code sections.

```js
//#set flag

//#if flag
alert('flag');
//#endif

//#unset flag

//#unless flag
alert('not flag');
//#endunless
```

The flags can take values.

```js
//#set ie 7

//#if ie = 7
alert('OMG!');
//#endif

//#unless ie = 7
alert('Cool!');
//#endunless
```

#### More examples

##### Different compare operators within the `#if` directives

```js
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

##### Checking a value from a dictionary or array

```js
//#set ie [7, 8]
//#if ie has 7
alert('ie = 7');
//#endif

// It's possible to add data to the existing array
//#set ie. 9

//#if ie has 9
alert('ie = 7');
//#endif

// It's possible to add or create nested fields within a dictionaries
//#set runtime.offlineMode

//#if runtime has offlineMode
alert('Offline mode enabled!');
//#endif
```

##### Testing a regular expression

```js
//#set ie /[7-9]/

//#if ie like 7
alert('ie = 7');
//#endif
```

##### Invoking a functional flag

```js
//#set ieVersions [7, 8, 9]
//#set ie function (o) { return o.flags.ieVersions.includes(o.value); }

//#if ie call 7
alert('ie = 7');
//#endif

//#if 7 callRight ie
alert('ie = 7');
//#endif
```

#### Flags

All the flags are declared globally. To set it in your code, you should use the directives `#set` and `#unset`,
and also, you can specify it when you run Monic. For example:

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

Similarly, you can create a debug flag and write debugging code within `//#if debug ... //#endif`,
that code never gets to the production server.

#### Using flags inside a path pattern

Flags that have been specified as build parameters or declared in the file' global scope can be used inside
`#include` and `#without` with using a special syntax.

```js
//#set lang en
//#include lang/${lang}.json
```

If the flag is a function, it will be executed. The result will be inserted into the template.
If the flag doesn't exist, then will be inserted an empty string.

### Including chunks of files

This functionality is handy to develop libraries and frameworks.
For example, there is a file *String.js* in your library containing several dozens of functions for working with strings.
Isolate each function in a separate file somehow wrong, but attach a few hundred lines of code for only one function
is also not desirable. To solve this problem, Monic can mark the file *String.js* on specific areas.
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

Please note that the marked-thus the area of the file inbuilt code can change the order between it and may
receive another code.

For instance:

```js
//#include String.js::escapeHTML
alert(1);
//#include String.js::truncate
```

After the build will receive

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
