import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeExec, homeFileExists, readHomeFile, textsOf, withFakeHost, writeHomeFile, type FakeHost } from "#test/styling-host.mts";
import { terminalComponent } from "../../components/terminal/index.mts";
import { applyStyle } from "../../plan.mts";
import { removeAll } from "../../removal.mts";

const FAMILY = "JetBrainsMono Nerd Font Mono";
const TERMINAL_ONLY = [terminalComponent()];
const KONSOLERC = ".config/konsolerc";
const ORIGINAL_RC = "[General]\nFoo=1\n\n[Desktop Entry]\nDefaultProfile=Old.profile\n\n[UiSettings]\nColorScheme=\n";

function withKonsole(files: Record<string, string>, fn: (host: FakeHost) => Promise<void>): Promise<void> {
  return withFakeHost({ platform: "linux", env: { KONSOLE_VERSION: "230804" }, files, exec: fakeExec({}) }, fn);
}

function setup(host: FakeHost) {
  return applyStyle(host, { yes: true, components: TERMINAL_ONLY });
}

function revert(host: FakeHost) {
  return removeAll(host, { yes: true, components: TERMINAL_ONLY });
}

test("Konsole gets a PicketAI colour scheme, a profile and, after a yes, the default (T-6.1)", async () => {
  await withKonsole({ [KONSOLERC]: ORIGINAL_RC }, async (host) => {
    await setup(host);
    const scheme = readHomeFile(host.home, ".local/share/konsole/PicketAI.colorscheme");
    assert.match(scheme, /\[Background\]\nColor=13,10,8\n/);
    assert.match(scheme, /\[Color1\]\nColor=229,72,77\n/);
    assert.match(scheme, /\[General\]\nDescription=PicketAI\nOpacity=1\n/);
    const profile = readHomeFile(host.home, ".local/share/konsole/PicketAI.profile");
    assert.match(profile, /^ColorScheme=PicketAI$/m);
    assert.match(profile, new RegExp(`^Font=${FAMILY},`, "m"));
    const rc = readHomeFile(host.home, KONSOLERC);
    assert.match(rc, /^DefaultProfile=PicketAI\.profile$/m);
    assert.equal(rc.replace("DefaultProfile=PicketAI.profile", "DefaultProfile=Old.profile"), ORIGINAL_RC);
  });
});

test("Konsole revert deletes both files and restores konsolerc, or puts back only the old default after an edit (T-6.2)", async () => {
  await withKonsole({ [KONSOLERC]: ORIGINAL_RC }, async (host) => {
    await setup(host);
    await revert(host);
    assert.equal(homeFileExists(host.home, ".local/share/konsole/PicketAI.colorscheme"), false);
    assert.equal(homeFileExists(host.home, ".local/share/konsole/PicketAI.profile"), false);
    assert.equal(readHomeFile(host.home, KONSOLERC), ORIGINAL_RC);
  });
  await withKonsole({ [KONSOLERC]: ORIGINAL_RC }, async (host) => {
    await setup(host);
    writeHomeFile(host.home, KONSOLERC, `${readHomeFile(host.home, KONSOLERC)}\n[MainWindow]\nState=1\n`);
    await revert(host);
    assert.equal(readHomeFile(host.home, KONSOLERC), `${ORIGINAL_RC}\n[MainWindow]\nState=1\n`);
  });
  await withKonsole({ [KONSOLERC]: "[General]\nFoo=1\n" }, async (host) => {
    await setup(host);
    writeHomeFile(host.home, KONSOLERC, `${readHomeFile(host.home, KONSOLERC)}Bar=2\n`);
    await revert(host);
    assert.ok(!readHomeFile(host.home, KONSOLERC).includes("DefaultProfile"), readHomeFile(host.home, KONSOLERC));
    assert.ok(readHomeFile(host.home, KONSOLERC).includes("Bar=2"));
  });
});

test("a second run changes nothing for Konsole (T-6.6)", async () => {
  await withKonsole({ [KONSOLERC]: ORIGINAL_RC }, async (host) => {
    await setup(host);
    assert.deepEqual((await setup(host)).changes, []);
  });
});

test("a konsolerc setup created keeps the user's later lines on revert and loses only DefaultProfile (T-9.1)", async () => {
  await withKonsole({}, async (host) => {
    await setup(host);
    writeHomeFile(host.home, KONSOLERC, `${readHomeFile(host.home, KONSOLERC)}\n[MainWindow]\nState=1\n`);
    const report = await revert(host);
    assert.equal(Object.fromEntries(report.changes.map((change: { id: string; result: string }) => [change.id, change.result]))["konsole-default"], "removed");
    assert.ok(!readHomeFile(host.home, KONSOLERC).includes("DefaultProfile"));
    assert.ok(readHomeFile(host.home, KONSOLERC).includes("[MainWindow]\nState=1"));
    assert.ok(!textsOf(report).some((text) => text.includes("undefined")));
  });
});
