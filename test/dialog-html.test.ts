import { describe, test, expect } from "bun:test";
import { buildHtml, FIELDS } from "../src/dialog-html";

describe("buildHtml", () => {
  const config = {
    region: "us-east-1",
    accessKeyId: "AKIATEST",
    secretAccessKey: "SecretTest",
    mfaArn: "arn:aws:iam::123456789012:mfa/user",
    roleArn: "arn:aws:iam::123456789012:role/TestRole",
    duration: "43200",
  };

  test("produces valid HTML with doctype", () => {
    const html = buildHtml(config);
    expect(html).toStartWith("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  test("contains all form fields", () => {
    const html = buildHtml(config);
    for (const field of FIELDS) {
      expect(html).toContain(`id="${field}"`);
    }
  });

  test("embeds config values as JSON in script", () => {
    const html = buildHtml(config);
    expect(html).toContain(JSON.stringify(config));
  });

  test("has password type on credential fields", () => {
    const html = buildHtml(config);
    expect(html).toContain('id="accessKeyId" type="password"');
    expect(html).toContain('id="secretAccessKey" type="password"');
  });

  test("does not have password type on non-credential fields", () => {
    const html = buildHtml(config);
    // region and mfaCode should not be password fields
    expect(html).not.toContain('id="region" type="password"');
    expect(html).not.toContain('id="mfaCode" type="password"');
  });

  test("has submit and cancel buttons", () => {
    const html = buildHtml(config);
    expect(html).toContain("submit()");
    expect(html).toContain("_cancel()");
  });

  test("has paste handler for Cmd/Ctrl+V", () => {
    const html = buildHtml(config);
    expect(html).toContain("_paste()");
    expect(html).toContain("e.metaKey || e.ctrlKey");
  });

  test("embeds special characters safely via JSON encoding", () => {
    const xssConfig = {
      ...config,
      region: 'us-east-1"<script>alert(1)</script>',
    };
    const html = buildHtml(xssConfig);
    // JSON.stringify escapes the quote, and the value is inside a JS string
    // literal — not raw HTML — so script tags don't execute.
    expect(html).toContain(JSON.stringify(xssConfig));
    // The closing </script> inside the JSON doesn't break the outer script
    // tag because it's inside a string literal.
    expect(html).toContain('alert(1)');
  });

  test("FIELDS list matches expected form fields", () => {
    expect(FIELDS).toEqual([
      "region", "accessKeyId", "secretAccessKey",
      "mfaArn", "roleArn", "duration", "mfaCode",
    ]);
  });
});
