import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { notificationCommand, notifyUser as notifyHandler } from "./index.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";

const notifyUser = looseHandler(notifyHandler);

type SpawnedOptions = { detached?: boolean; stdio?: unknown; windowsHide?: boolean; env: Record<string, string | undefined> };
type Call = { command: string; args: string[]; options: SpawnedOptions };

function recordedNotifications(event: object, { platform = "win32" as NodeJS.Platform, env = {} } = {}) {
  const calls: Call[] = [];
  const result = notifyUser(event, hookContext(resolve("."), { platform, env }), (command: string, args: string[], options: SpawnedOptions) => calls.push({ command, args, options }));
  return { result, calls };
}

const PERMISSION_PROMPT = { hook_event_name: "Notification", notification_type: "permission_prompt", message: "  Claude needs your permission to use Bash  ", cwd: join("work", "shop") };
const decodedScript = (args: string[]) => Buffer.from(args[args.indexOf("-EncodedCommand") + 1], "base64").toString("utf16le");

function commandFor(platform: NodeJS.Platform, texts: { title: string; body: string }) {
  const command = notificationCommand(platform, texts);
  assert.ok(command, platform);
  return command;
}

test("notifyUser starts one detached, silent notifier for a permission or idle prompt and prints nothing", () => {
  for (const notification_type of ["permission_prompt", "idle_prompt"]) {
    const { result, calls } = recordedNotifications({ ...PERMISSION_PROMPT, notification_type }, { env: { PATH: "p" } });
    assert.equal(result, null);
    assert.equal(calls.length, 1, notification_type);
    const [{ command, options }] = calls;
    assert.equal(command, "cmd.exe");
    assert.deepEqual({ detached: options.detached, stdio: options.stdio, windowsHide: options.windowsHide }, { detached: true, stdio: "ignore", windowsHide: true });
    assert.deepEqual(options.env, { PATH: "p", PICKET_NOTIFY_TITLE: "Picket: shop", PICKET_NOTIFY_BODY: "Claude needs your permission to use Bash" });
  }
});

test("notifyUser starts nothing for another notification type, PICKET_NOTIFY=off, or a platform without a notifier", () => {
  assert.deepEqual(recordedNotifications({ ...PERMISSION_PROMPT, notification_type: "auth_success" }).calls, []);
  assert.deepEqual(recordedNotifications(PERMISSION_PROMPT, { env: { PICKET_NOTIFY: "off" } }).calls, []);
  assert.deepEqual(recordedNotifications(PERMISSION_PROMPT, { platform: "aix" }).calls, []);
  assert.equal(recordedNotifications(PERMISSION_PROMPT, { platform: "aix" }).result, null);
});

test("notifyUser titles a notification without a cwd Picket and fills an empty message", () => {
  const { calls } = recordedNotifications({ notification_type: "idle_prompt", message: " " });
  assert.equal(calls[0].options.env.PICKET_NOTIFY_TITLE, "Picket");
  assert.equal(calls[0].options.env.PICKET_NOTIFY_BODY, "Claude Code is waiting for you");
});

test("notifyUser cuts a long message to 200 characters", () => {
  const { calls } = recordedNotifications({ ...PERMISSION_PROMPT, message: "x".repeat(250) });
  assert.equal(calls[0].options.env.PICKET_NOTIFY_BODY, "x".repeat(200));
});

test("the Windows notifier launches powershell.exe through cmd.exe with constant arguments cmd cannot misread", () => {
  const { command, args } = commandFor("win32", { title: "50% off & more", body: "a|b<c>d^\"e" });
  assert.equal(command, "cmd.exe");
  assert.deepEqual(args.slice(0, -1), ["/d", "/c", "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand"]);
  assert.equal(args.some((arg) => /[%^&|<>"]/.test(arg)), false);
});

test("the Windows notifier runs one constant encoded script and carries the texts only in its environment", () => {
  const hostile = commandFor("win32", { title: "Picket: shop", body: "a\"b'$(x)" });
  const plain = commandFor("win32", { title: "other", body: "text" });
  assert.equal(decodedScript(hostile.args), decodedScript(plain.args));
  assert.match(decodedScript(hostile.args), /CreateTextNode\(\$env:PICKET_NOTIFY_TITLE\)/);
  assert.deepEqual(hostile.env, { PICKET_NOTIFY_TITLE: "Picket: shop", PICKET_NOTIFY_BODY: "a\"b'$(x)" });
  assert.equal(hostile.args.some((arg) => arg.includes("$(x)") || arg.includes("Picket: shop")), false);
});

test("the macOS and Linux notifiers pass the title and body as their own trailing arguments", () => {
  const texts = { title: "Picket: shop", body: "a\"b'$(x)" };
  const mac = commandFor("darwin", texts);
  const linux = commandFor("linux", texts);
  assert.equal(mac.command, "osascript");
  assert.deepEqual(mac.args.slice(-2), [texts.title, texts.body]);
  const scripts = mac.args.filter((_, i) => mac.args[i - 1] === "-e");
  assert.equal(scripts.some((line) => line.includes(texts.title) || line.includes(texts.body)), false);
  assert.equal(linux.command, "notify-send");
  assert.deepEqual(linux.args, ["--app-name=Picket", "--", texts.title, texts.body]);
  assert.equal(notificationCommand("aix", texts), null);
});
