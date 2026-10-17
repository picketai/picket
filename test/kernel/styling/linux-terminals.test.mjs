import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setupTerminal } from "../../../core/lib/styling/setup.mjs";
import { terminalComponent } from "../../../core/lib/styling/terminal.mjs";
import { exited, fakeDconf, fakeExec, fakeHost, homeFiles, textsOf, writeHomeFile } from "./host-fixture.mjs";

const FAMILY = "JetBrainsMono Nerd Font Mono";
const TERMINAL_ONLY = [terminalComponent()];
const KONSOLERC = ".config/konsolerc";
const ORIGINAL_RC = "[General]\nFoo=1\n\n[Desktop Entry]\nDefaultProfile=Old.profile\n\n[UiSettings]\nColorScheme=\n";
const GNOME = "/org/gnome/terminal/legacy/profiles:/";
const PTYXIS = "/org/gnome/Ptyxis/";
const PALETTE = ".local/share/org.gnome.Ptyxis/palettes/picketai.palette";

async function withHost(options, fn) {
  const host = fakeHost({ platform: "linux", exec: fakeExec({}), ...options });
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

function setup(host, options = {}) {
  return setupTerminal(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function revert(host) {
  return setupTerminal(host, { revert: true, yes: true, components: TERMINAL_ONLY });
}

function read(host, rel) {
  return readFileSync(join(host.home, ...rel.split("/")), "utf8");
}

function exists(host, rel) {
  return existsSync(join(host.home, ...rel.split("/")));
}

function konsoleHost(files = { [KONSOLERC]: ORIGINAL_RC }) {
  return { env: { KONSOLE_VERSION: "230804" }, files };
}

test("Konsole gets a PicketAI colour scheme, a profile and, after a yes, the default (T-6.1)", async () => {
  await withHost(konsoleHost(), async (host) => {
    await setup(host);
    const scheme = read(host, ".local/share/konsole/PicketAI.colorscheme");
    assert.match(scheme, /\[Background\]\nColor=13,10,8\n/);
    assert.match(scheme, /\[Color1\]\nColor=229,72,77\n/);
    assert.match(scheme, /\[General\]\nDescription=PicketAI\nOpacity=1\n/);
    const profile = read(host, ".local/share/konsole/PicketAI.profile");
    assert.match(profile, /^ColorScheme=PicketAI$/m);
    assert.match(profile, new RegExp(`^Font=${FAMILY},`, "m"));
    const rc = read(host, KONSOLERC);
    assert.match(rc, /^DefaultProfile=PicketAI\.profile$/m);
    assert.equal(rc.replace("DefaultProfile=PicketAI.profile", "DefaultProfile=Old.profile"), ORIGINAL_RC);
  });
});

test("Konsole revert deletes both files and restores konsolerc, or puts back only the old default after an edit (T-6.2)", async () => {
  await withHost(konsoleHost(), async (host) => {
    await setup(host);
    await revert(host);
    assert.equal(exists(host, ".local/share/konsole/PicketAI.colorscheme"), false);
    assert.equal(exists(host, ".local/share/konsole/PicketAI.profile"), false);
    assert.equal(read(host, KONSOLERC), ORIGINAL_RC);
  });
  await withHost(konsoleHost(), async (host) => {
    await setup(host);
    writeHomeFile(host.home, KONSOLERC, `${read(host, KONSOLERC)}\n[MainWindow]\nState=1\n`);
    await revert(host);
    assert.equal(read(host, KONSOLERC), `${ORIGINAL_RC}\n[MainWindow]\nState=1\n`);
  });
  const withoutDefault = "[General]\nFoo=1\n";
  await withHost(konsoleHost({ [KONSOLERC]: withoutDefault }), async (host) => {
    await setup(host);
    writeHomeFile(host.home, KONSOLERC, `${read(host, KONSOLERC)}Bar=2\n`);
    await revert(host);
    assert.ok(!read(host, KONSOLERC).includes("DefaultProfile"), read(host, KONSOLERC));
    assert.ok(read(host, KONSOLERC).includes("Bar=2"));
  });
});

function gnomeDconf() {
  return fakeDconf({ [`${GNOME}list`]: "['abc']", [`${GNOME}default`]: "'abc'", [`${GNOME}:abc/visible-name`]: "'Default'" });
}

function newGnomeUuid(dconf) {
  const match = /^\['abc', '([0-9a-f-]{36})'\]$/.exec(dconf.values.get(`${GNOME}list`));
  assert.ok(match, dconf.values.get(`${GNOME}list`));
  return match[1];
}

test("GNOME Terminal gets a new PicketAI profile, and the default only after a yes (T-6.3)", async () => {
  const dconf = gnomeDconf();
  await withHost({ env: { GNOME_TERMINAL_SCREEN: "/org/gnome/Terminal/screen/1" }, exec: fakeExec({ dconf: dconf.run }) }, async (host) => {
    await setup(host);
    const uuid = newGnomeUuid(dconf);
    const key = (name) => dconf.values.get(`${GNOME}:${uuid}/${name}`);
    assert.equal(key("visible-name"), "'PicketAI'");
    assert.equal(key("use-theme-colors"), "false");
    assert.equal(key("foreground-color"), "'#FDEFD4'");
    assert.equal(key("background-color"), "'#0D0A08'");
    assert.equal(key("cursor-colors-set"), "true");
    assert.equal(key("cursor-background-color"), "'#F9782B'");
    assert.equal(key("highlight-colors-set"), "true");
    assert.equal(key("highlight-background-color"), "'#5A3A22'");
    assert.equal(key("use-system-font"), "false");
    assert.equal(key("font"), `'${FAMILY} 12'`);
    const palette = key("palette").slice(1, -1).split(", ");
    assert.equal(palette.length, 16);
    assert.equal(palette[0], "'#0D0A08'");
    assert.equal(palette.at(-1), "'#FFFFFF'");
    assert.equal(dconf.values.get(`${GNOME}default`), `'${uuid}'`);
  });
  const declined = gnomeDconf();
  await withHost({ env: { GNOME_TERMINAL_SCREEN: "1" }, exec: fakeExec({ dconf: declined.run }), answers: ["yes", "no"] }, async (host) => {
    await setup(host, { yes: false });
    newGnomeUuid(declined);
    assert.equal(declined.values.get(`${GNOME}default`), "'abc'");
  });
});

test("GNOME Terminal revert resets the profile and restores list and default, keeping a profile added later (T-6.4)", async () => {
  const dconf = gnomeDconf();
  await withHost({ env: { GNOME_TERMINAL_SCREEN: "1" }, exec: fakeExec({ dconf: dconf.run }) }, async (host) => {
    await setup(host);
    const uuid = newGnomeUuid(dconf);
    dconf.values.set(`${GNOME}list`, `['abc', '${uuid}', 'xyz']`);
    await revert(host);
    assert.equal(dconf.values.get(`${GNOME}list`), "['abc', 'xyz']");
    assert.equal(dconf.values.get(`${GNOME}default`), "'abc'");
    assert.ok(![...dconf.values.keys()].some((key) => key.includes(uuid)));
  });
});

function ptyxisDconf() {
  return fakeDconf({ [`${PTYXIS}profile-uuids`]: "['p1']", [`${PTYXIS}default-profile-uuid`]: "'p1'", [`${PTYXIS}use-system-font`]: "true", [`${PTYXIS}font-name`]: "'Monospace 11'" });
}

test("Ptyxis gets a palette file and a profile; the app-wide font changes only after its own yes (T-6.5)", async () => {
  const dconf = ptyxisDconf();
  const before = new Map(dconf.values);
  await withHost({ env: { PTYXIS_VERSION: "47.0" }, exec: fakeExec({ dconf: dconf.run }) }, async (host) => {
    await setup(host);
    const palette = read(host, PALETTE);
    assert.match(palette, /^Name=PicketAI$/m);
    assert.match(palette, /^Background=#0D0A08$/m);
    for (let i = 0; i < 16; i++) assert.match(palette, new RegExp(`^Color${i}=#[0-9A-F]{6}$`, "m"));
    const uuid = /^\['p1', '([0-9a-f]{32})'\]$/.exec(dconf.values.get(`${PTYXIS}profile-uuids`))[1];
    assert.equal(dconf.values.get(`${PTYXIS}Profiles/${uuid}/palette`), "'picketai'");
    assert.equal(dconf.values.get(`${PTYXIS}default-profile-uuid`), `'${uuid}'`);
    assert.equal(dconf.values.get(`${PTYXIS}use-system-font`), "false");
    assert.equal(dconf.values.get(`${PTYXIS}font-name`), `'${FAMILY} 12'`);
    await revert(host);
    assert.equal(exists(host, PALETTE), false);
    assert.deepEqual(new Map(dconf.values), before);
  });
  const declined = ptyxisDconf();
  await withHost({ env: { PTYXIS_VERSION: "47.0" }, exec: fakeExec({ dconf: declined.run }), answers: ["yes", "yes", "no"] }, async (host) => {
    await setup(host, { yes: false });
    assert.equal(declined.values.get(`${PTYXIS}use-system-font`), "true");
    assert.equal(declined.values.get(`${PTYXIS}font-name`), "'Monospace 11'");
  });
});

test("a second run changes nothing for Konsole, GNOME Terminal and Ptyxis (T-6.6)", async () => {
  await withHost(konsoleHost(), async (host) => {
    await setup(host);
    assert.deepEqual((await setup(host)).changes, []);
  });
  for (const [env, dconf] of [[{ GNOME_TERMINAL_SCREEN: "1" }, gnomeDconf()], [{ PTYXIS_VERSION: "47.0" }, ptyxisDconf()]]) {
    await withHost({ env, exec: fakeExec({ dconf: dconf.run }) }, async (host) => {
      await setup(host);
      assert.deepEqual((await setup(host)).changes, []);
    });
  }
});

test("a konsolerc setup created keeps the user's later lines on revert and loses only DefaultProfile (T-9.1)", async () => {
  await withHost(konsoleHost({}), async (host) => {
    await setup(host);
    writeHomeFile(host.home, KONSOLERC, `${read(host, KONSOLERC)}\n[MainWindow]\nState=1\n`);
    const report = await revert(host);
    assert.equal(Object.fromEntries(report.changes.map((change) => [change.id, change.result]))["konsole-default"], "removed");
    assert.ok(!read(host, KONSOLERC).includes("DefaultProfile"));
    assert.ok(read(host, KONSOLERC).includes("[MainWindow]\nState=1"));
    assert.ok(!textsOf(report).some((text) => text.includes("undefined")));
  });
});

test("a failed dconf reset leaves a manual step that loads the saved dump (T-9.5)", async () => {
  const dconf = gnomeDconf();
  let failing = false;
  const run = (args) => (failing && args[0] === "reset" ? exited(1) : dconf.run(args));
  await withHost({ env: { GNOME_TERMINAL_SCREEN: "1" }, exec: fakeExec({ dconf: run }) }, async (host) => {
    await setup(host);
    const manifest = JSON.parse(read(host, ".picketai/styling-manifest.json"));
    const dump = manifest.items.find((item) => item.id === "gnome-terminal-profile").backup;
    failing = true;
    const report = await revert(host);
    const step = report.manual.find((text) => text.includes("dconf load"));
    assert.ok(step?.includes(dump), report.manual.join("\n"));
    assert.ok(!textsOf(report).some((text) => text.includes("undefined")), textsOf(report).join("\n"));
  });
});

test("without dconf GNOME Terminal and Ptyxis report a manual step and write nothing (T-6.6)", async () => {
  for (const env of [{ GNOME_TERMINAL_SCREEN: "1" }, { PTYXIS_VERSION: "47.0" }]) {
    await withHost({ env, exec: fakeExec({ dconf: () => exited(null) }) }, async (host) => {
      const report = await setup(host);
      assert.deepEqual(report.changes.map((change) => change.result), ["manual"]);
      assert.ok(report.manual.some((step) => step.includes("dconf")));
      assert.deepEqual(homeFiles(host.home), []);
    });
  }
});
