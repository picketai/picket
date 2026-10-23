import { test } from "node:test";
import assert from "node:assert/strict";
import { exited, fakeDconf, fakeExec, homeFileExists, homeFiles, readHomeFile, withFakeHost, type Exec, type FakeHost } from "#test/styling-host.mts";
import { terminalComponent } from "../../components/terminal/index.mts";
import { applyStyle, type ApplyOptions } from "../../plan.mts";
import { removeAll } from "../../removal.mts";

type Dconf = ReturnType<typeof fakeDconf>;

const FAMILY = "JetBrainsMono Nerd Font Mono";
const TERMINAL_ONLY = [terminalComponent()];
const PTYXIS = "/org/gnome/Ptyxis/";
const PALETTE = ".local/share/org.gnome.Ptyxis/palettes/picketai.palette";

function withPtyxis(exec: Exec, fn: (host: FakeHost) => Promise<void>, answers: string[] = []): Promise<void> {
  return withFakeHost({ platform: "linux", env: { PTYXIS_VERSION: "47.0" }, exec, answers }, fn);
}

function setup(host: FakeHost, options: ApplyOptions = {}) {
  return applyStyle(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function revert(host: FakeHost) {
  return removeAll(host, { yes: true, components: TERMINAL_ONLY });
}

function ptyxisDconf(): Dconf {
  return fakeDconf({ [`${PTYXIS}profile-uuids`]: "['p1']", [`${PTYXIS}default-profile-uuid`]: "'p1'", [`${PTYXIS}use-system-font`]: "true", [`${PTYXIS}font-name`]: "'Monospace 11'" });
}

test("Ptyxis gets a palette file and a profile; the app-wide font changes only after its own yes (T-6.5)", async () => {
  const dconf = ptyxisDconf();
  const before = new Map(dconf.values);
  await withPtyxis(fakeExec({ dconf: dconf.run }), async (host) => {
    await setup(host);
    const palette = readHomeFile(host.home, PALETTE);
    assert.match(palette, /^Name=PicketAI$/m);
    assert.match(palette, /^Background=#0D0A08$/m);
    for (let i = 0; i < 16; i++) assert.match(palette, new RegExp(`^Color${i}=#[0-9A-F]{6}$`, "m"));
    const match = /^\['p1', '([0-9a-f]{32})'\]$/.exec(dconf.values.get(`${PTYXIS}profile-uuids`) ?? "");
    assert.ok(match);
    const uuid = match[1];
    assert.equal(dconf.values.get(`${PTYXIS}Profiles/${uuid}/palette`), "'picketai'");
    assert.equal(dconf.values.get(`${PTYXIS}default-profile-uuid`), `'${uuid}'`);
    assert.equal(dconf.values.get(`${PTYXIS}use-system-font`), "false");
    assert.equal(dconf.values.get(`${PTYXIS}font-name`), `'${FAMILY} 12'`);
    await revert(host);
    assert.equal(homeFileExists(host.home, PALETTE), false);
    assert.deepEqual(new Map(dconf.values), before);
  });
  const declined = ptyxisDconf();
  await withPtyxis(
    fakeExec({ dconf: declined.run }),
    async (host) => {
      await setup(host, { yes: false });
      assert.equal(declined.values.get(`${PTYXIS}use-system-font`), "true");
      assert.equal(declined.values.get(`${PTYXIS}font-name`), "'Monospace 11'");
    },
    ["yes", "yes", "no"],
  );
});

test("a second run changes nothing for Ptyxis (T-6.6)", async () => {
  const dconf = ptyxisDconf();
  await withPtyxis(fakeExec({ dconf: dconf.run }), async (host) => {
    await setup(host);
    assert.deepEqual((await setup(host)).changes, []);
  });
});

test("without dconf Ptyxis reports a manual step and writes nothing (T-6.6)", async () => {
  await withPtyxis(fakeExec({ dconf: () => exited(null) }), async (host) => {
    const report = await setup(host);
    assert.deepEqual(report.changes.map((change: { result: string }) => change.result), ["manual"]);
    assert.ok(report.manual.some((step: string) => step.includes("dconf")));
    assert.deepEqual(homeFiles(host.home), []);
  });
});
