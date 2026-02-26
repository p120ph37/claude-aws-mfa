import { Webview, SizeHint } from "webview-bun";
import { lib } from "webview-bun/src/ffi";
import type { Config } from "./config";
import { buildHtml } from "./dialog-html";

export interface DialogResult {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  mfaArn: string;
  roleArn: string;
  duration: string;
  mfaCode: string;
}

export function showDialog(defaults: Partial<Config>): DialogResult | null {
  const webview = new Webview(false, {
    width: 440,
    height: 620,
    hint: SizeHint.FIXED,
  });
  webview.title = "Claude AWS MFA";

  let result: DialogResult | null = null;

  // Must call webview_terminate (not destroy) from callbacks — run() handles
  // destroy on return.
  const handle = webview.unsafeHandle;

  webview.bind("_submit", (json: string) => {
    result = JSON.parse(json);
    lib.symbols.webview_terminate(handle);
  });

  webview.bind("_cancel", () => lib.symbols.webview_terminate(handle));

  // Webview doesn't support Cmd/Ctrl+V natively — read clipboard from Bun side.
  webview.bind("_paste", () => {
    const proc = Bun.spawnSync(
      process.platform === "darwin"
        ? ["pbpaste"]
        : process.platform === "win32"
          ? ["powershell", "-Command", "Get-Clipboard"]
          : ["xclip", "-selection", "clipboard", "-o"]
    );
    return proc.stdout.toString();
  });

  webview.setHTML(buildHtml({
    region: defaults.region ?? "",
    accessKeyId: defaults.accessKeyId ?? "",
    secretAccessKey: defaults.secretAccessKey ?? "",
    mfaArn: defaults.mfaArn ?? "",
    roleArn: defaults.roleArn ?? "",
    duration: String(defaults.duration ?? 43200),
  }));

  webview.run();
  return result;
}
