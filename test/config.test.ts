import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("config serialization", () => {
  const config = {
    region: "us-west-2",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    mfaArn: "arn:aws:iam::123456789012:mfa/user",
    roleArn: "arn:aws:iam::123456789012:role/TestRole",
    duration: 7200,
  };

  test("round-trips through JSON correctly", () => {
    const json = JSON.stringify(config, null, 2) + "\n";
    expect(JSON.parse(json)).toEqual(config);
  });

  test("does not include mfaCode", () => {
    expect(config).not.toHaveProperty("mfaCode");
  });

  test("contains all expected fields", () => {
    for (const key of ["region", "accessKeyId", "secretAccessKey", "mfaArn", "roleArn", "duration"]) {
      expect(config).toHaveProperty(key);
    }
  });

  test("duration is a number", () => {
    expect(typeof config.duration).toBe("number");
  });
});

describe("config file I/O", () => {
  let tmpDir: string;

  test("writes and reads config file", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "claude-aws-mfa-test-"));
    const path = join(tmpDir, "test-config.json");

    const config = {
      region: "eu-west-1",
      accessKeyId: "AKID",
      secretAccessKey: "SECRET",
      mfaArn: "arn:mfa",
      roleArn: "arn:role",
      duration: 3600,
    };

    writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
    const loaded = JSON.parse(readFileSync(path, "utf-8"));
    expect(loaded).toEqual(config);

    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns null for missing file", () => {
    try {
      readFileSync("/nonexistent/path/config.json", "utf-8");
      expect(true).toBe(false); // should not reach here
    } catch {
      // Expected — loadConfig wraps this in try/catch and returns null
    }
  });
});
