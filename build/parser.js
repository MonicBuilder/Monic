"use strict";

module.exports = Parser;

var FileStructure = require("./file"), MonicError = require("./error");

var fs = require("fs"), path = require("path");

var async = require("async"), glob = require("glob");

/**
 * Объект парсера файла
 *
 * @constructor
 * @param {!Object} params - дополнительные параметры операции
 * @param {string} params.lineSeparator - символ перевода строки
 * @param {!Array} params.replacers - массив функций трансформации
 */
function Parser(params) {
  this.nl = params.lineSeparator;
  this.replacers = params.replacers || /* istanbul ignore next */[];
  this.realpathCache = {};
  this.cache = {};
}

/**
 * Проверить существование указанного файла
 * и вернуть абсолютный путь к нему
 *
 * @param {string} file - адрес файла
 * @param {function(Error, string=)} callback - функция обратного вызова
 */
Parser.prototype.normalizePath = function (file, callback) {
  var _this = this;
  file = path.normalize(path.resolve(file));

  if (this.realpathCache[file]) {
    callback(null, file);
  } else {
    async.waterfall([function (callback) {
      fs.exists(file, function (exists) {
        callback(null, exists);
      });
    }, function (exists, callback) {
      /* istanbul ignore if */
      if (!exists) {
        return callback(new Error("File \"" + file + "\" not found"));
      }

      fs.stat(file, function (err, stat) {
        callback(err, stat);
      });
    }, function (stat, callback) {
      /* istanbul ignore if */
      if (!stat.isFile()) {
        return callback(new Error("\"" + file + "\" is not a file"));
      }

      _this.realpathCache[file] = true;
      callback(null, file);
    }], callback);
  }
};

/**
 * Провести парсинг указанного файла
 * и вернуть его структуру
 *
 * @param {string} file - адрес файла
 * @param {function(Error, FileStructure=, string=)} callback - функция обратного вызова
 */
Parser.prototype.parseFile = function (file, callback) {
  var _this2 = this;
  this.normalizePath(file, function (err, src) {
    /* istanbul ignore if */
    if (err) {
      return callback(err);
    }

    if (_this2.cache[src]) {
      return callback(null, _this2.cache[src], src);
    }

    fs.readFile(src, "utf8", function (err, content) {
      /* istanbul ignore if */
      if (err) {
        return callback(err);
      }

      _this2.parse(src, content, callback);
    });
  });
};

/**
 * Провести парсинг заданного текста
 * и вернуть его структуру
 *
 * @param {string} file - адрес файла
 * @param {string} content - содержимое файла
 * @param {function(Error, FileStructure=, string=)} callback - функция обратного вызова
 */
Parser.prototype.parse = function (file, content, callback) {
  var _this3 = this;
  /* istanbul ignore next */
  if (this.cache[file]) {
    return callback(null, this.cache[file], file);
  }

  var actions = [], dirname = path.dirname(file);

  // Обработка перегрузок
  content = this.replacers.reduce(function (content, el) {
    content = el(content, file);
    return content;
  }, content);

  // Обработка масок URL
  content = content.replace(/^(\s*\/\/(?:#include|without)\s+)(.*)/gm, function (sstr, decl, src) {
    if (/\*/.test(src)) {
      actions.push(function (callback) {
        var parts = src.split("::");
        glob(path.join(dirname, parts[0]), null, function (err, files) {
          /* istanbul ignore else */
          if (files) {
            content = content.replace(sstr, files.reduce(function (res, el) {
              parts[0] = path.relative(dirname, el);
              res += decl + parts.join("::") + _this3.nl;
              return res;
            }, ""));
          }

          callback(err, files);
        });
      });
    }

    return sstr;
  });

  async.parallel(actions, function (err) {
    /* istanbul ignore if */
    if (err) {
      return callback(err);
    }

    var fileStructure = new FileStructure(file, _this3.nl), lines = content.split(/\r?\n|\r/);

    _this3.cache[file] = fileStructure;

    var parseLines = function (start) {
      var errors = [], i;

      /* istanbul ignore next */
      function appendError(err) {
        var msg = err.message, line = i + 1;

        errors.push(new MonicError(msg, file, line));
        fileStructure.error(msg);
      }

      function asyncParseCallback(err) {
        /* istanbul ignore if */
        if (err) {
          appendError(err);
        }

        parseLines(i + 1);
      }

      for (i = start; i < lines.length; i++) {
        var line = lines[i];

        if (line.match(/^\s*\/\/#(.*)/)) {
          /* istanbul ignore else */
          if (RegExp.$1) {
            var command = RegExp.$1.split(" "), dir = String(command.shift());

            var key = "_" + dir, params = command.join(" ");

            if (/^(include|without)$/.test(dir)) {
              return _this3[key](fileStructure, params, asyncParseCallback);

              /* istanbul ignore else */
            } else if (/^(label|endlabel|if|endif|set|unset)$/.test(dir)) {
              try {
                _this3[key](fileStructure, params);
              } catch (err) {
                /* istanbul ignore next */
                appendError(err);
              }
            } else {
              /* istanbul ignore next */
              appendError(new Error("Unknown directive " + dir));
            }
          }
        } else {
          fileStructure.addCode(line + (i < lines.length - 1 ? _this3.nl : ""));
        }
      }

      callback(null, fileStructure, file);
    };

    parseLines(0);
  });
};

/**
 * Директива #include
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} params - параметры директивы
 * @param {function(Error=)} callback - функция обратного вызова
 */
Parser.prototype._include = function (file, params, callback) {
  var paramsParts = params.split("::"), includeFileName = paramsParts.shift();

  paramsParts = paramsParts.reduce(function (res, el) {
    res[el] = true;
    return res;
  }, {});

  if (includeFileName) {
    var src = file.getRelativePathOf(includeFileName);
    this.parseFile(src, function (err, includeFile) {
      /* istanbul ignore if */
      if (err) {
        return callback(err);
      }

      file.addInclude(includeFile, paramsParts);
      callback();
    });
  } else {
    for (var key in paramsParts) {
      /* istanbul ignore if */
      if (!paramsParts.hasOwnProperty(key)) {
        continue;
      }

      file.root.labels[key] = true;
    }

    callback();
  }
};

/**
 * Директива #without
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 * @param {function(Error=)} callback - функция обратного вызова
 */
Parser.prototype._without = function (file, value, callback) {
  var paramsParts = value.split("::"), includeFname = file.getRelativePathOf(paramsParts.shift());

  paramsParts = paramsParts.reduce(function (res, el) {
    res[el] = true;
    return res;
  }, {});

  this.parseFile(includeFname, function (err, includeFile) {
    /* istanbul ignore if */
    if (err) {
      return callback(err);
    }

    file.addWithout(includeFile, paramsParts);
    callback();
  });
};

/**
 * Директива #label
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._label = function (file, value) {
  file.beginLabel(value);
};

/**
 * Директива #endlabel
 * @param {!FileStructure} file - структура файла
 */
Parser.prototype._endlabel = function (file) {
  file.endLabel();
};

/**
 * Директива #if
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._if = function (file, value) {
  /* istanbul ignore if */
  if (!value.trim()) {
    throw new Error("Bad \"if\" directive");
  }

  var args = value.split(/\s+/), res = true;

  if (args.length > 1 && args[0] === "not") {
    res = false;
    args.shift();
  }

  file.beginIf(args[0], res);
};

/**
 * Директива #endif
 * @param {!FileStructure} file - структура файла
 */
Parser.prototype._endif = function (file) {
  file.endIf();
};

/**
 * Директива #set
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._set = function (file, value) {
  /* istanbul ignore if */
  if (!value.trim()) {
    throw new Error("Bad set directive");
  }

  file.addSet(value.split(/\s+/)[0]);
};

/**
 * Директива #unset
 *
 * @param {!FileStructure} file - структура файла
 * @param {string} value - значение директивы
 */
Parser.prototype._unset = function (file, value) {
  /* istanbul ignore if */
  if (!value.trim()) {
    throw new Error("Bad unset directive");
  }

  file.addUnset(value.split(/\s+/)[0]);
};