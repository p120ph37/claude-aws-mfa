import { Webview, SizeHint } from "webview-bun";
import { lib } from "webview-bun/src/ffi";
import type { Config } from "./config";

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

function buildHtml(config: Record<string, string>) {
  return /*html*/ `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    padding: 20px; background: #f5f5f7; color: #1d1d1f;
  }
  h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .field { margin-bottom: 12px; }
  label { display: block; font-size: 12px; font-weight: 500; color: #6e6e73; margin-bottom: 4px; }
  input {
    width: 100%; padding: 8px 10px; border: 1px solid #d2d2d7;
    border-radius: 6px; font-size: 14px; background: #fff; outline: none;
  }
  input:focus { border-color: #0071e3; box-shadow: 0 0 0 2px rgba(0,113,227,0.2); }
  .buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  button {
    padding: 8px 20px; border-radius: 6px; font-size: 14px; cursor: pointer;
    border: 1px solid #d2d2d7; background: #fff; color: #1d1d1f;
  }
  button.primary { background: #0071e3; color: #fff; border-color: #0071e3; }
  button:hover { filter: brightness(0.95); }
  hr { border: none; border-top: 1px solid #d2d2d7; margin: 16px 0; }
</style>
</head>
<body>
  <h2>Claude AWS MFA</h2>
  <div class="field"><label>AWS Region</label><input id="region" placeholder="us-east-1"></div>
  <div class="field"><label>Access Key ID</label><input id="accessKeyId" type="password" placeholder="AKIA..."></div>
  <div class="field"><label>Secret Access Key</label><input id="secretAccessKey" type="password"></div>
  <div class="field"><label>MFA Device ARN</label><input id="mfaArn" placeholder="arn:aws:iam::123456789012:mfa/user"></div>
  <div class="field"><label>Role ARN</label><input id="roleArn" placeholder="arn:aws:iam::123456789012:role/MyRole"></div>
  <div class="field"><label>Session Duration (seconds)</label><input id="duration" placeholder="43200"></div>
  <hr>
  <div class="field"><label>MFA Code</label><input id="mfaCode" placeholder="123456"></div>
  <div class="buttons">
    <button onclick="_cancel()">Cancel</button>
    <button class="primary" onclick="submit()">OK</button>
  </div>
  <script>
    const FIELDS = ["region","accessKeyId","secretAccessKey","mfaArn","roleArn","duration","mfaCode"];
    const config = ${JSON.stringify(config)};
    for (const [k, v] of Object.entries(config))
      if (document.getElementById(k)) document.getElementById(k).value = v;
    document.getElementById("mfaCode").focus();

    function submit() {
      _submit(JSON.stringify(Object.fromEntries(
        FIELDS.map(id => [id, document.getElementById(id).value])
      )));
    }

    document.addEventListener("keydown", async e => {
      if (e.key === "Enter") return submit();
      if (e.key === "Escape") return _cancel();
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        const text = await _paste();
        const el = document.activeElement;
        if (el?.tagName === "INPUT") {
          const start = el.selectionStart, end = el.selectionEnd;
          el.value = el.value.slice(0, start) + text + el.value.slice(end);
          el.selectionStart = el.selectionEnd = start + text.length;
        }
      }
    });
  </script>
</body>
</html>`;
}
