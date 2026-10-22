export function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const nxt = argv[i + 1];
      const val = nxt === undefined || nxt.startsWith("--") ? true : argv[++i];
      opt[key] = key in opt ? [].concat(opt[key], val) : val;
    } else pos.push(a);
  }
  return { pos, opt };
}
