/**
 * Standart Monic error
 */
export class MonicError {
	/**
	 * @param {(string|!Error)} msg - an error text or an error object
	 * @param {string=} [opt_file] - a path to a file in which the error occurred
	 * @param {number=} [opt_line] - a line number where the error occurred
	 */
	constructor(msg, opt_file, opt_line) {
		this.message = msg.message || msg;
		this.file = opt_file;
		this.line = opt_line;
	}
}
