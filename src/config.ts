import { homedir } from "os";
import { join } from "path";
import { chmodSync, readFileSync } from "fs";
import { STSClient } from "@aws-sdk/client-sts";

export interface Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  mfaArn: string;
  roleArn: string;
  duration: number;
}

const CONFIG_PATH = join(homedir(), ".config", "claude-aws-mfa.json");

export function loadConfig(): Config | null {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: Config) {
  Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  chmodSync(CONFIG_PATH, 0o600);
}

export async function seedDefaults(): Promise<Partial<Config>> {
  const defaults: Partial<Config> = {};
  try {
    const client = new STSClient({});
    const creds = await client.config.credentials();
    if (creds.accessKeyId) defaults.accessKeyId = creds.accessKeyId;
    if (creds.secretAccessKey) defaults.secretAccessKey = creds.secretAccessKey;
    defaults.region = await client.config.region();
  } catch {}
  return defaults;
}
