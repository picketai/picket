/**
 * Vendored from shell-quote v1.10.0 (parse.js), MIT License.
 * https://github.com/ljharb/shell-quote
 *
 * Copyright (c) 2013 James Halliday (mail@substack.net)
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 *
 * Vendored (converted CJS -> ESM, no other changes) so guard.bash.mjs has
 * zero runtime dependencies: the hooks directory is deployed into host
 * projects that have no node_modules, where a package import would fail and
 * silently disable the guard on every command.
 */

// '<(' is process substitution operator and
// can be parsed the same as control operator
var CONTROL = '(?:' + [
	'\\|\\|',
	'\\&\\&',
	';;',
	'\\|\\&',
	'\\<\\(',
	'\\<\\<\\<',
	'>>',
	'>\\&',
	'<\\&',
	'[&;()|<>]'
].join('|') + ')';
var controlRE = new RegExp('^' + CONTROL + '$');
var META = '|&;()<> \\t';
var SINGLE_QUOTE = '\'([^\']*?)\'';
var DOUBLE_QUOTE = '"((\\\\"|[^"])*?)"';
var hash = /^#$/;

var SQ = "'";
var DQ = '"';
var DS = '$';

var TOKEN = '';
var mult = 0x100000000; // Math.pow(16, 8);
for (var i = 0; i < 4; i++) {
	TOKEN += (mult * Math.random()).toString(16);
}
var startsWithToken = new RegExp('^' + TOKEN);

function matchAll(s, r) {
	var origIndex = r.lastIndex;

	var matches = [];
	var matchObj;

	while ((matchObj = r.exec(s))) {
		matches[matches.length] = matchObj;
		if (r.lastIndex === matchObj.index) {
			r.lastIndex += 1;
		}
	}

	r.lastIndex = origIndex;

	return matches;
}

function getVar(env, pre, key) {
	var r = typeof env === 'function' ? env(key) : env[key];
	if (typeof r === 'undefined' && key != '') {
		r = '';
	} else if (typeof r === 'undefined') {
		r = '$';
	}

	if (typeof r === 'object') {
		return pre + TOKEN + JSON.stringify(r) + TOKEN;
	}
	return pre + r;
}

function parseInternal(string, env, opts) {
	if (!opts) {
		opts = {};
	}
	var BS = opts.escape || '\\';
	var ifs = opts.splitUnquoted === true ? ' \t\n' : (typeof opts.splitUnquoted === 'string' ? opts.splitUnquoted : '');
	var BAREWORD = '(\\' + BS + '[\'"' + META + ']|[^\\s\'"' + META + '])+';

	var chunker = new RegExp([
		'(' + CONTROL + ')', // control chars
		'(' + BAREWORD + '|' + DOUBLE_QUOTE + '|' + SINGLE_QUOTE + ')+'
	].join('|'), 'g');

	var matches = matchAll(string, chunker);

	if (matches.length === 0) {
		return [];
	}
	if (!env) {
		env = {};
	}

	var commented = false;

	return matches.map(function (match) {
		var s = match[0];
		if (!s || commented) {
			return void undefined;
		}
		if (controlRE.test(s)) {
			return { op: s };
		}

		// Hand-written scanner/parser for Bash quoting rules:
		//
		// 1. inside single quotes, all characters are printed literally.
		// 2. inside double quotes, all characters are printed literally
		//    except variables prefixed by '$' and backslashes followed by
		//    either a double quote or another backslash.
		// 3. outside of any quotes, backslashes are treated as escape
		//    characters and not printed (unless they are themselves escaped)
		// 4. quote context can switch mid-token if there is no whitespace
		//     between the two quote contexts (e.g. all'one'"token" parses as
		//     "allonetoken")
		var quote = false;
		var esc = false;
		var out = '';
		var words = [];
		var sawQuote = false;
		var pendingNw = null;
		var isGlob = false;
		var i;

		function parseEnvVar() {
			i += 1;
			var varend;
			var varname;
			var char = s.charAt(i);

			if (char === '{') {
				i += 1;
				if (s.charAt(i) === '}') {
					throw new Error('Bad substitution: ' + s.slice(i - 2, i + 1));
				}
				// match braces by depth so a nested `${` keeps its inner `}` from ending the outer substitution
				var depth = 1;
				varend = i;
				while (depth > 0 && varend < s.length) {
					if (s.charAt(varend) === '{' && s.charAt(varend - 1) === '$') {
						depth += 1;
					} else if (s.charAt(varend) === '}') {
						depth -= 1;
					}
					varend += 1;
				}
				if (depth !== 0) {
					throw new Error('Bad substitution: ' + s.slice(i));
				}
				varend -= 1;
				varname = s.slice(i, varend);
				i = varend;
			} else if ((/[*@#?$!_-]/).test(char)) {
				varname = char;
				i += 1;
			} else {
				var slicedFromI = s.slice(i);
				varend = slicedFromI.match(/[^\w\d_]/);
				if (!varend) {
					varname = slicedFromI;
					i = s.length;
				} else {
					varname = slicedFromI.slice(0, varend.index);
					i += varend.index - 1;
				}
			}
			return getVar(env, '', varname);
		}

		function flushRun() {
			if (pendingNw === null) {
				return;
			}
			if (pendingNw === 0) {
				if (out !== '') {
					words[words.length] = out;
					out = '';
				}
			} else {
				words[words.length] = out;
				out = '';
				for (var fe = 1; fe < pendingNw; fe += 1) {
					words[words.length] = '';
				}
			}
			pendingNw = null;
		}

		for (i = 0; i < s.length; i++) {
			var c = s.charAt(i);
			if (ifs && c !== DS) {
				flushRun();
			}
			isGlob = isGlob || (!quote && (c === '*' || c === '?'));
			if (esc) {
				out += c;
				esc = false;
			} else if (quote) {
				if (c === quote) {
					quote = false;
				} else if (quote == SQ) {
					out += c;
				} else { // Double quote
					if (c === BS) {
						i += 1;
						c = s.charAt(i);
						if (c === DQ || c === BS || c === DS) {
							out += c;
						} else {
							out += BS + c;
						}
					} else if (c === DS) {
						out += parseEnvVar();
					} else {
						out += c;
					}
				}
			} else if (c === DQ || c === SQ) {
				quote = c;
				sawQuote = true;
			} else if (controlRE.test(c)) {
				return { op: s };
			} else if (hash.test(c)) {
				commented = true;
				var commentObj = { comment: string.slice(match.index + i + 1) };
				if (out.length) {
					return [out, commentObj];
				}
				return [commentObj];
			} else if (c === BS) {
				esc = true;
			} else if (c === DS) {
				var value = parseEnvVar();
				if (!ifs) {
					out += value;
				} else {
					for (var vi = 0; vi < value.length; vi += 1) {
						var vc = value.charAt(vi);
						if (ifs.indexOf(vc) < 0) {
							flushRun();
							out += vc;
						} else if (pendingNw === null) {
							pendingNw = vc === ' ' || vc === '\t' || vc === '\n' ? 0 : 1;
						} else if (vc !== ' ' && vc !== '\t' && vc !== '\n') {
							pendingNw += 1;
						}
					}
				}
			} else {
				out += c;
			}
		}

		if (isGlob) {
			return { op: 'glob', pattern: out };
		}

		if (ifs) {
			if (pendingNw !== null && pendingNw > 0) {
				words[words.length] = out;
				out = '';
				for (var te = 1; te < pendingNw; te += 1) {
					words[words.length] = '';
				}
			}
			if (out !== '' || (sawQuote && words.length === 0)) {
				words[words.length] = out;
			}
			return words;
		}

		return out;
	}).reduce(function (prev, arg) { // finalize parsed arguments
		if (typeof arg === 'undefined') {
			return prev;
		}
		[].concat(arg).forEach(function (entry) {
			prev[prev.length] = entry;
		});
		return prev;
	}, []);
}

export function parse(s, env, opts) {
	var mapped = parseInternal(s, env, opts);
	if (typeof env !== 'function') {
		return mapped;
	}
	return mapped.reduce(function (acc, s) {
		if (typeof s === 'object') {
			acc[acc.length] = s;
			return acc;
		}
		var xs = s.split(RegExp('(' + TOKEN + '.*?' + TOKEN + ')', 'g'));
		if (xs.length === 1) {
			acc[acc.length] = xs[0];
			return acc;
		}
		xs.filter(Boolean).forEach(function (x) {
			acc[acc.length] = startsWithToken.test(x)
				? JSON.parse(x.split(TOKEN)[1])
				: x;
		});
		return acc;
	}, []);
}
