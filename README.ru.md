Monic
=====

Monic — сборщик JS-файлов ([форк Jossy](https://github.com/Kolyaj/Jossy)) в один или несколько модулей.
При правильном использовании позволяет не только легко собирать модули, но и также легко пересобирать их при изменении
принципов сборки.

[Документация на английском](https://github.com/MonicBuilder/Monic/blob/master/README.md)

[![NPM version](http://img.shields.io/npm/v/monic.svg?style=flat)](http://badge.fury.io/js/monic)
[![NPM dependencies](http://img.shields.io/david/MonicBuilder/Monic.svg?style=flat)](https://david-dm.org/MonicBuilder/Monic)
[![NPM devDependencies](http://img.shields.io/david/dev/MonicBuilder/Monic.svg?style=flat)](https://david-dm.org/MonicBuilder/Monic?type=dev)
[![Build Status](http://img.shields.io/travis/MonicBuilder/Monic.svg?style=flat&branch=master)](https://travis-ci.org/MonicBuilder/Monic)
[![Coverage Status](http://img.shields.io/coveralls/MonicBuilder/Monic.svg?style=flat)](https://coveralls.io/r/MonicBuilder/Monic?branch=master)

## Установка

```bash
npm install monic --global
```

## Плагины

* [Gulp](https://github.com/MonicBuilder/gulp-monic)
* [Grunt](https://github.com/MonicBuilder/grunt-monic)
* [WebPack](https://github.com/MonicBuilder/monic-loader)

## Использование в командной строке

```bash
monic [options] [file ...]
```

### options

```
-h, --help
-V, --version
-f, --file [src]             путь к исходному файлу (мета-информация)
-o, --output [src]           путь для сохранения сгенерированного файла
--eol [char]                 разделитель строки (EOL)
--flags [list]               список флагов через запятую
--labels [list]              список меток через запятую
-s, --source-maps [val]      [true|false|inline]
--source-map-file [src]      путь для сохранения SourceMap
--source-root [path]         корень для всех ссылок внутри SourceMap
```

### Дополнение

Результат сборки выводится в output, поэтому для сохранения в файл нужно использовать возможности командной оболочки,
например,

```bash
monic file.js --flags ie --labels escapeHTML > _file.js
```

Или можно использовать `--output`

```bash
monic file.js --flags ie --labels escapeHTML -o _file.js
```

### Примеры

**Сборка файла с выводом результата в консоль**

```bash
monic myFile.js
```

**Сборка файла с сохранением результата в другой файл**

```bash
monic myFile.js > myNewFile.js
```

**Сборка файла с сохранением результата в другой файл и генерацией SourceMap**

```bash
# SourceMap сохранится как "myFile-compiled.js.map"
monic myFile.js -s -o myFile-compiled.js

# SourceMap сохранится как "myFile.map"
monic myFile.js -s -o myFile-compiled.js --source-map myFile.map

# SourceMap сохранится внутри "myFile-compiled.js"
monic myFile.js -s inline -o myFile-compiled.js
```

**Сборка текста с выводом результата в консоль**

```bash
monic '//#include foo/*.js' -f myFile.js
```

**Использование поверх `stdio`**

```bash
echo '//#include foo/*.js' | monic -f myFile.js
```

## Использование в NodeJS

```js
var monic = require('monic');
monic.compile(
  'myFile.js',

  {
    // Путь к рабочей директории
    // (опционально, по умолчанию module.parent)
    cwd: 'myDir/',

    // Разделитель строки (опционально, по умолчанию \n)
    eol: '\r\n',

    // Таблица задаваемых меток (опционально)
    labels: {
      escapeHTML: true
    },

    // Таблица задаваемых флагов (опционально)
    flags: {
      ie: true
    },

    // Если true, то сгенерированные файлы будут сохранены
    // (опционально, по умолчанию false)
    saveFiles: true,

    // Путь к сгенерированному файлу (опционально)
    file: 'myFiled-compiled.js',

    // Если true или 'inline', то будет сгенерирован source map
    // (опционально, по умолчанию false)
    sourceMaps: true,

    // Объект source map на основе которого будет идти генерация
    // (опционально)
    inputSourceMap: null,

    // Путь к сгенерированному source map (опционально, по умолчанию ${file}.map)
    sourceMapFile: 'myFiled.map',

    // Корень для всех ссылок внутри SourceMap (опционально)
    sourceRoot: 'myDir/'
  },

  function (err, result, {map, decl, url, isExternal}) {
    if (err) {
      throw err;
    }

    console.log(result);
  }
);
```

### Использование Promise API

```js
var monic = require('monic');
monic.compile('myFile.js')
  .then(function ({result, sourceMap: {map, decl, url, isExternal}}) {
    ...
  })

  .catch(function (err) {
    ...
  });
```

### Явное указание текста файла

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

### Задание функций предварительной обработки

```js
var monic = require('monic');
monic.compile(
  'myFile.js',

  {
    replacers: [
      // Замена require конструкций на #include
      // (this ссылается на экземпляр сборщика)
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

## Синтаксис и возможности
### Подключение файлов

Включить содержимое внешнего файла в текущий можно директивой `#include ...`.

```js
//#include file.js
```

Путь к файлу указывается относительно расположения текущего файла или в абсолютной форме.
В пути к файлу можно также использовать [шаблоны](https://github.com/isaacs/node-glob).

```js
//#include lib/*.js
```

Технически, вместо строки с директивой просто вставляется содержимое указанного файла.
Однако, если указанный файл уже подключен в текущем модуле ранее, то повторно он включен не будет. Например:

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

```bash
monic f3.js > result.js
```

**result.js**

```js
alert(1);
alert(2);
```

### Исключение файлов

Директива `#without` указывает Monic исключить из сборки все файлы, которые используются в указанном
(включая указанный, разумеется).

**Пример**

В проекте есть несколько десятков виджетов. Код каждого виджета лежит в отдельном файле.
В каждом виджете указаны его зависимости с помощью директивы `#include`.
Какие-то виджеты используются на большинстве страниц, и при сборке логично их код вынести в отдельный файл *common.js*.
Выбираем часто используемые виджеты, создаём файл *common.js* и пишем туда:

```js
//#include widget1.js
//#include widget2.js
//#include widget3.js
```

На одной из страниц используется виджет, достаточно объёмный, чтобы не включать его в *common.js*,
назовём его *big-widget*. В файле *big-widget.js* указаны его зависимости, среди которых,
разумеется, много тех, которые уже есть в *common.js*. Если мы просто соберём файл *big-widget.js*,
то получим много продублированного кода. Поэтому рядом с *common.js* создаём файл *feature.js* с содержимым:

```js
//#without common.js
//#include big-widget.js
```

Теперь код, попавший в *common.js*, не попадёт в *feature.js*.
Главное не забыть подключить на страницу не только *feature.js*, но и *common.js*.

Формат пути в директиве такой же, как и в `#include`.

### Условная сборка

В процессе сборки можно определять специальные флаги, в зависимости от которых выводить или не выводить строки кода.

```js
//#set flag

//#if flag
alert('flag');
/*? Можно использовать //#end if */
//#endif

//#unset flag

//#unless flag
alert('not flag');
/*? Можно использовать //#end unless */
//#endunless
```

Флагам можно задавать значения.

```js
//#set ie 7

//#if ie 7
alert('OMG!');
//#endif

//#unless ie 7
alert('Cool!');
//#endunless
```

Примеры:

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

Флаги глобальные. Указать их можно не только в коде директивами `#set` и `#unset`, но при запуске сборщика. Например:

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

Точно также можно создать флаг debug и писать отладочные строки только внутри `//#if debug ... //#endif`,
тогда отладочный код никогда не попадёт на боевые сервера.

#### Использование флагов в шаблонах подключения файлов

Флаги, которые были заданы при запуске сборщика или в глобальной области файла, могут быть вызваны в директивах
`#include` и `#without` через специальный синтаксис.

```js
//#set lang en
//#include lang/${lang}.json
```

Если заданного флага не существует, то вставится пустая строка.

### Подключение кусков файлов

Эта функциональность очень полезна полезна при разработке библиотек и фреймворков.
Например, в нашей библиотеке есть файл *String.js*, содержащий несколько десятков функций для работы со строками.
Выделять каждую функцию в отдельный файл как-то неправильно, но и подключать потом несколько сотен строк кода ради одной
функции тоже не хочется. В случае с Monic файл *String.js* размечается на области.
Имена у областей могут быть произвольными, но лучше, чтобы они совпадали с именами функций.

```js
var String = {};

//#label truncate
String.truncate = function () {

};
/*? Можно использовать //#end label */
//#endlabel truncate

//#label escapeHTML
String.escapeHTML = function () {

};
//#endlabel escapeHTML
```

Теперь, если нам нужна только функция `escapeHTML`, то при подключении файла *String.js* пишем

```js
//#include String.js::escapeHTML
```

В результате в сборку попадёт только

```js
var String = {};

String.escapeHTML = function () {

};
```

Если нужно подключить несколько областей, указываем несколько

```js
//#include String.js::trim::truncate
```

Если нужно подключить всё, кроме размеченных областей (например, нам нужен только namespace String), то

```js
//#include String.js::
```

Если же какой-то области необходима другая область из текущего файла, то используем `#include` без указания файла.

```js
//#label truncate
//#include ::trim
String.truncate = function () {};
//#endlabel truncate
```

Обратите внимание, что размеченные таким образом области файла в собранном коде могут поменять порядок и
между ними может появиться другой код.

Например:

```js
//#include String.js::escapeHTML
alert(1);
//#include String.js::truncate
```

После сборки получим

```js
var String = {};

String.escapeHTML = function () {

};

alert(1);

String.truncate = function () {

};
```

Поэтому использовать `#label` внутри функций и выражений нельзя, на выходе получим поломанный JavaScript.

Кроме этого, `#without` тоже смотрит на эти области. Поэтому, например, `escapeHTML` может попасть в *common.js*,
а `truncate` — в *feature.js*.

## [Лицензия](https://github.com/MonicBuilder/Monic/blob/master/LICENSE)

The MIT License.
