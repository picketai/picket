import { test } from "node:test";
import assert from "node:assert/strict";
import { exited, fakeDconf, fakeExec, homeFiles, readHomeFile, textsOf, withFakeHost, type Exec, type FakeHost } from "#test/styling-host.mts";
import { setupTerminal } from "../../setup.mjs";
import { terminalComponent } from "../../terminal.mjs";

type Dconf = ReturnType<typeof fakeDconf>;

const FAMILY = "JetBrainsMono Nerd Font Mono";
const TERMINAL_ONLY = [terminalComponent()];
const GNOME = "/org/gnome/terminal/legacy/profiles:/";

function withGnome(exec: Exec, fn: (host: FakeHost) => Promise<void>, answers: string[] = []): Promise<void> {
  return withFakeHost({ platform: "linux", env: { GNOME_TERMINAL_SCREEN: "/org/gnome/Terminal/screen/1" }, exec, answers }, fn);
}

function setup(host: FakeHost, options = {}) {
  return setupTerminal(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function revert(host: FakeHost) {
  return setupTerminal(host, { revert: true, yes: true, components: TERMINAL_ONLY });
}

function gnomeDconf(): Dconf {
  return fakeDconf({ [`${GNOME}list`]: "['abc']", [`${GNOME}default`]: "'abc'", [`${GNOME}:abc/visible-name`]: "'Default'" });
}

function newGnomeUuid(dconf: Dconf): string {
  const match = /^\['abc', '([0-9a-f-]{36})'\]$/.exec(dconf.values.get(`${GNOME}list`) ?? "");
  assert.ok(match, dconf.values.get(`${GNOME}list`));
  return match[1];
}

test("GNOME Terminal gets a new PicketAI profile, and the default only after a yes (T-6.3)", async () => {
  const dconf = gnomeDconf();
  await withGnome(fakeExec({ dconf: dconf.run }), async (host) => {
    await setup(host);
    const uuid = newGnomeUuid(dconf);
    const key = (name: string) => dconf.values.get(`${GNOME}:${uuid}/${name}`);
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
    const palette = (key("palette") ?? "").slice(1, -1).split(", ");
    assert.equal(palette.length, 16);
    assert.equal(palette[0], "'#0D0A08'");
    assert.equal(palette.at(-1), "'#FFFFFF'");
    assert.equal(dconf.values.get(`${GNOME}default`), `'${uuid}'`);
  });
  const declined = gnomeDconf();
  await withGnome(
    fakeExec({ dconf: declined.run }),
    async (host) => {
      await setup(host, { yes: false });
      newGnomeUuid(declined);
      assert.equal(declined.values.get(`${GNOME}default`), "'abc'");
    },
    ["yes", "no"],
  );
});

test("GNOME Terminal revert resets the profile and restores list and default, keeping a profile added later (T-6.4)", async () => {
  const dconf = gnomeDconf();
  await withGnome(fakeExec({ dconf: dconf.run }), async (host) => {
    await setup(host);
    const uuid = newGnomeUuid(dconf);
    dconf.values.set(`${GNOME}list`, `['abc', '${uuid}', 'xyz']`);
    await revert(host);
    assert.equal(dconf.values.get(`${GNOME}list`), "['abc', 'xyz']");
    assert.equal(dconf.values.get(`${GNOME}default`), "'abc'");
    assert.ok(![...dconf.values.keys()].some((key) => key.includes(uuid)));
  });
});

test("a second run changes nothing for GNOME Terminal (T-6.6)", async () => {
  const dconf = gnomeDconf();
  await withGnome(fakeExec({ dconf: dconf.run }), async (host) => {
    await setup(host);
    assert.deepEqual((await setup(host)).changes, []);
  });
});

test("a failed dconf reset leaves a manual step that loads the saved dump (T-9.5)", async () => {
  const dconf = gnomeDconf();
  let failing = false;
  const run = (args: string[]) => (failing && args[0] === "reset" ? exited(1) : dconf.run(args));
  await withGnome(fakeExec({ dconf: run }), async (host) => {
    await setup(host);
    const manifest = JSON.parse(readHomeFile(host.home, ".picketai/styling-manifest.json"));
    const dump = manifest.items.find((item: { id: string }) => item.id === "gnome-terminal-profile").backup;
    failing = true;
    const report = await revert(host);
    const step = report.manual.find((text: string) => text.includes("dconf load"));
    assert.ok(step?.includes(dump), report.manual.join("\n"));
    assert.ok(!textsOf(report).some((text) => text.includes("undefined")), textsOf(report).join("\n"));
  });
});

test("without dconf GNOME Terminal reports a manual step and writes nothing (T-6.6)", async () => {
  await withGnome(fakeExec({ dconf: () => exited(null) }), async (host) => {
    const report = await setup(host);
    assert.deepEqual(report.changes.map((change: { result: string }) => change.result), ["manual"]);
    assert.ok(report.manual.some((step: string) => step.includes("dconf")));
    assert.deepEqual(homeFiles(host.home), []);
  });
});
