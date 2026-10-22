import { spawn as spawnProcess } from "node:child_process";
import { basename } from "node:path";

const WAITING = new Set(["permission_prompt", "idle_prompt"]);
const BODY_LIMIT = 200;
const EMPTY_BODY = "Claude Code is waiting for you";
const POWERSHELL_APP_ID = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";

const TOAST_SCRIPT = [
  "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null",
  "$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
  "$texts = $xml.GetElementsByTagName('text')",
  "$texts.Item(0).AppendChild($xml.CreateTextNode($env:PICKET_NOTIFY_TITLE)) | Out-Null",
  "$texts.Item(1).AppendChild($xml.CreateTextNode($env:PICKET_NOTIFY_BODY)) | Out-Null",
  "$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)",
  `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${POWERSHELL_APP_ID}').Show($toast)`,
].join("\n");
const ENCODED_TOAST_SCRIPT = Buffer.from(TOAST_SCRIPT, "utf16le").toString("base64");

const APPLESCRIPT = ["on run argv", "display notification (item 2 of argv) with title (item 1 of argv)", "end run"];

const COMMANDS = {
  win32: ({ title, body }) => ({
    command: "cmd.exe",
    args: ["/d", "/c", "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", ENCODED_TOAST_SCRIPT],
    env: { PICKET_NOTIFY_TITLE: title, PICKET_NOTIFY_BODY: body },
  }),
  darwin: ({ title, body }) => ({ command: "osascript", args: [...APPLESCRIPT.flatMap((line) => ["-e", line]), title, body], env: {} }),
  linux: ({ title, body }) => ({ command: "notify-send", args: ["--app-name=Picket", "--", title, body], env: {} }),
};

export function notificationCommand(platform, texts) {
  return Object.hasOwn(COMMANDS, platform) ? COMMANDS[platform](texts) : null;
}

function titleOf(event) {
  return typeof event.cwd === "string" && event.cwd ? `Picket: ${basename(event.cwd)}` : "Picket";
}

function bodyOf(event) {
  const message = typeof event.message === "string" ? event.message.trim() : "";
  return message ? message.slice(0, BODY_LIMIT) : EMPTY_BODY;
}

function startDetached(command, args, options) {
  const child = spawnProcess(command, args, options);
  child.on("error", () => {});
  child.unref();
}

export function notifyUser(event, { spawn = startDetached, platform = process.platform, env = process.env } = {}) {
  if (!WAITING.has(event?.notification_type) || env.PICKET_NOTIFY === "off") return null;
  const notification = notificationCommand(platform, { title: titleOf(event), body: bodyOf(event) });
  if (notification) spawn(notification.command, notification.args, { detached: true, stdio: "ignore", windowsHide: true, env: { ...env, ...notification.env } });
  return null;
}
