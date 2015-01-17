# Monic

Monic — сборщик JS-файлов ([форк Jossy](https://github.com/Kolyaj/Jossy)) в один или несколько модулей.
При правильном использовании позволяет не только легко собирать модули,
но и также легко пересобирать их при изменении принципов сборки.

[![NPM version](http://img.shields.io/npm/v/monic.svg?style=flat)](http://badge.fury.io/js/monic)
[![NPM dependencies](http://img.shields.io/david/kobezzza/Monic.svg?style=flat)](https://david-dm.org/kobezzza/Monic#info=dependencies&view=table)
[![NPM devDependencies](http://img.shields.io/david/dev/kobezzza/Monic.svg?style=flat)](https://david-dm.org/kobezzza/Monic#info=devDependencies&view=table)
[![Build Status](http://img.shields.io/travis/kobezzza/Monic.svg?style=flat&branch=master)](https://travis-ci.org/kobezzza/Monic)
[![Coverage Status](http://img.shields.io/coveralls/kobezzza/Monic.svg?style=flat)](https://coveralls.io/r/kobezzza/Monic?branch=master)

## Использование
### Сборка из командной строки
#### Установка

```bash
npm install monic --global
```

#### Использование

```bash
monic [options] [file ...]
```

##### options

```bash
-h, --help               вывод справки
-V, --version            вывод версии Monic

-f, --file [src]         путь к файлу (метаинформация)

--line-separator         символ новой строки (\n, \r или \r\n)
--flags [list]           список флагов через запятую
--labels [list]          список меток через запятую
```

##### Дополнение

Результат сборки выводится в output, поэтому для сохранения в файл нужно использовать возможности командной оболочки, например,

```bash
monic file.js --flags ie --labels escapeHTML > _file.js
```

#### Примеры

**Сборка файла с выводом результата в консоль**

```bash
monic myFile.js
```

**Сборка текста с выводом результата в консоль**

```bash
monic '//#include foo/*.js' -f myFile.js
```

Или поверх `stdio`

```bash
echo '//#include foo/*.js' | monic -f myFile.js
```

### Плагины

* [Gulp](https://github.com/kobezzza/gulp-monic)
* [Grunt](https://github.com/kobezzza/grunt-monic)

### Использование сборщика из NodeJS

```js
var monic = require('monic');
monic.compile(
	'myFile.js',

	{
		// Символ перевода строки (опционально, по умолчанию \n)
		lineSeparator: '\r\n',

		// Таблица задаваемых меток (опционально)
		labels: {
			escapeHTML: true
		},

		// Таблица задаваемых флагов (опционально)
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
Технически, вместо строки с директивой просто вставляется содержимое указанного файла.
Однако, если указанный файл уже подключен в текущем модуле ранее, то повторно он включен не будет. Например,

```js
alert(1);
```

Файл f2.js

```js
//#include f1.js
alert(2);
```

И файл f3.js

```js
//#include f1.js
//#include f2.js
```

Если указать Monic файл f3.js, то на выходе будет:

```js
alert(1);
alert(2);
```

В пути к файлу можно также использовать [шаблоны](https://github.com/isaacs/node-glob).

```js
//#include lib/*.js
```

### Исключение файлов из сборки

Директива `#without` указывает Monic исключить из сборки все файлы, которые используются в указанном (включая указанный, разумеется).

**Пример**

В проекте есть несколько десятков виджетов. Код каждого виджета лежит в отдельном файле.
В каждом виджете указаны его зависимости с помощью директивы `#include`.
Какие-то виджеты используются на большинстве страниц, и при сборке логично их код вынести в отдельный файл *common.js*.
Выбираем часто используемые виджеты, создаём файл common.js и пишем туда:

```js
//#include widget1.js
//#include widget2.js
//#include widget3.js
```

На одной из страниц используется виджет, достаточно объёмный, чтобы не включать его в common.js,
назовём его *big-widget*. В файле big-widget.js указаны его зависимости, среди которых,
разумеется, много тех, которые уже есть в common.js. Если мы просто соберём файл big-widget.js,
то получим много продублированного кода. Поэтому рядом с common.js создаём файл feature.js с содержимым:

```js
//#without common.js
//#include big-widget.js
```

Теперь код, попавший в common.js, не попадёт в feature.js.
Главное не забыть подключить на страницу не только feature.js, но и common.js.

Формат пути в директиве такой же, как и в `#include`.

### Условная сборка

В процессе сборки можно определять булевые флаги, в зависимости от которых выводить или не выводить строки кода.

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

Флаги глобальные. Указать их можно не только в коде директивами `#set` и `#unset`, но при запуске сборщика (о запуске сборщика ниже).

Например, файл file.js

```js
//#if ie
alert('IE only');
//#endif
```

Файл common.js

```js
//#include file.js
```

И файл common-ie.js

```js
//#set ie
//#include file.js
```

Точно также можно создать флаг debug и писать отладочные строки только внутри `//#if debug ... //#endif`,
тогда отладочный код никогда не попадёт на боевые сервера.

### Подключение кусков файлов

Эта функциональность очень полезна полезна при разработке библиотек и фреймворков.
Например, в нашей библиотеке есть файл String.js, содержащий несколько десятков функций для работы со строками.
Выделять каждую функцию в отдельный файл как-то неправильно, но и подключать потом несколько сотен строк кода ради одной функции тоже не хочется. В случае с Monic файл String.js размечается на области.
Имена у областей могут быть произвольными, но лучше, чтобы они совпадали с именами функций.

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

Теперь, если нам нужна только функция `escapeHTML`, то при подключении файла String.js пишем

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

Например,

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

Кроме этого, `#without` тоже смотрит на эти области. Поэтому, например, `escapeHTML` может попасть в common.js,
а `truncate` — в feature.js.

## [Лицензия](https://github.com/kobezzza/Monic/blob/master/LICENSE)

The MIT License.
