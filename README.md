# claude-aws-mfa

AWS MFA credential helper for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Shows a native dialog to collect AWS credentials and an MFA code, calls STS AssumeRole with automatic duration negotiation, and outputs temporary credentials in the format Claude Code expects.

## Install

Requires [Bun](https://bun.sh) runtime.

```bash
bun install -g claude-aws-mfa
```

Or run directly without installing:

```bash
bunx claude-aws-mfa
```

## Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "awsCredentialExport": "bunx claude-aws-mfa"
}
```

## How it works

1. On first run, seeds the dialog with credentials from your existing AWS config (`~/.aws/credentials`, environment variables, SSO, etc.)
2. Shows a native GUI dialog with fields for region, access key, secret key, MFA ARN, role ARN, session duration, and MFA code
3. Calls `sts:AssumeRole` with the MFA token
4. If the requested session duration is rejected, automatically retries with shorter durations (12h → 6h → 2h → 1h)
5. Saves configuration to `~/.config/claude-aws-mfa.json` (mode 0600) for subsequent runs
6. Outputs temporary credentials as JSON to stdout

On subsequent runs, all fields are pre-populated from the saved config — just enter a fresh MFA code and hit OK.

## System requirements

The GUI dialog uses [webview-bun](https://github.com/tr1ckydev/webview-bun), which requires:

- **macOS**: No additional dependencies (uses WebKit)
- **Linux**: `sudo apt install libgtk-4-1 libwebkitgtk-6.0-4` (Debian/Ubuntu)
- **Windows**: Edge WebView2 runtime (included in Windows 11+)

## Development

```bash
bun install
bun run src/index.ts       # run locally
bun test                   # run tests
```

## License

MIT
