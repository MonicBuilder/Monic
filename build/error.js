/*!
 * Monic v1.2.0
 * https://github.com/MonicBuilder/Monic
 *
 * Released under the MIT license
 * https://github.com/MonicBuilder/Monic/blob/master/LICENSE
 *
 * Date: Wed, 15 Apr 2015 05:49:45 GMT
 */

// istanbul ignore next
"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

exports.__esModule = true;
/**
 * Standart Monic error
 */

var MonicError = (function () {
	/**
  * @param {string} msg - an error text
  * @param {string} file - a path to a file in which the error occurred
  * @param {number} line - a line number where the error occurred
  */

	function MonicError(msg, file, line) {
		_classCallCheck(this, MonicError);

		this.message = msg;
		this.file = file;
		this.line = line;
	}

	/** @return {string} */

	MonicError.prototype.toString = function toString() {
		return "Error: " + this.message + " (" + this.file + ": " + this.line + ")";
	};

	return MonicError;
})();

exports.MonicError = MonicError;