/**
 * Standart Monic error
 */
export class MonicError {
	/**
	 * @param {string} msg - an error text
	 * @param {string} file - path to a file in which the error occurred
	 * @param {number} line - line number where the error occurred
	 */
	construtor(msg, file, line) {
		this.message = msg;
		this.file = file;
		this.line = line;
	}

	/** @return {string} */
	toString() {
		return `Error: ${this.message} (${this.file}: ${this.line})`;
	}
}
