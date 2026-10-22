import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "site");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(root);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const textFiles = files.filter((f) => /\.(html|js|css|csv)$/.test(f));

test("every HTML page has lang, viewport and title", () => {
  for (const f of htmlFiles) {
    const html = readFileSync(f, "utf8");
    assert.match(html, /<html lang="en">/, f);
    assert.match(html, /name="viewport"/, f);
    assert.match(html, /<title>[^<]+<\/title>/, f);
  }
});

test("local links and assets resolve to files", () => {
  for (const f of htmlFiles) {
    const html = readFileSync(f, "utf8");
    for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(url)) continue;
      let target = resolve(dirname(f), url.split("#")[0]);
      if (url.endsWith("/")) target = join(target, "index.html");
      assert.ok(existsSync(target), `${f}: broken link ${url}`);
    }
  }
});

test("in-page anchors point to existing ids", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
  }
});

test("external links are https and new-tab links use rel=noopener", () => {
  for (const f of htmlFiles) {
    const html = readFileSync(f, "utf8");
    assert.doesNotMatch(html, /href="http:\/\//, f);
    for (const [tag] of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) {
      assert.match(tag, /rel="noopener noreferrer"/, `${f}: ${tag}`);
    }
  }
});

test("no secrets or placeholder content shipped", () => {
  const secret = /(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|api[_-]?key\s*[:=])/i;
  for (const f of textFiles) {
    const txt = readFileSync(f, "utf8");
    assert.doesNotMatch(txt, secret, f);
    assert.doesNotMatch(txt, /lorem ipsum|TODO|href="#"\s*>/i, f);
  }
});

test("prototype projects are labelled honestly", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const card = (id) => html.split(`id="${id}"`)[1].split("</article>")[0];
  assert.match(card("cs-01"), /badge--built/);
  assert.match(card("cs-02"), /badge--progress/);
  assert.match(card("cs-02"), /No AI model in v0/);
  assert.match(card("cs-02"), /not AI/);
  assert.match(card("cs-03"), /badge--progress/);
  assert.match(card("cs-03"), /sample data/i);
  assert.match(card("cs-03"), /not<\/strong> been conducted/);
  assert.doesNotMatch(card("cs-02") + card("cs-03"), /badge--built/);
  assert.match(html, /no live model/i);
  const dash = readFileSync(join(root, "demos/friction/index.html"), "utf8");
  assert.match(dash, /Sample data — not research findings/);
  const cmf = readFileSync(join(root, "demos/cmf/index.html"), "utf8");
  assert.match(cmf, /No AI model in v0/);
});

test("pages are compatible with the strict CSP (no inline scripts or styles)", () => {
  const csp = readFileSync(join(root, "_headers"), "utf8");
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /style-src 'self' https:\/\/fonts\.googleapis\.com;/);
  for (const f of htmlFiles) {
    const html = readFileSync(f, "utf8");
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, `${f}: inline <script>`);
    assert.doesNotMatch(html, /<style[\s>]/, `${f}: <style> block`);
    assert.doesNotMatch(html, /\sstyle="/, `${f}: style attribute`);
    assert.doesNotMatch(html, /\son[a-z]+="/, `${f}: inline event handler`);
  }
  for (const f of files.filter((f) => f.endsWith(".js"))) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /style=/, `${f}: style attribute in generated markup`);
  }
});

test("each certificate has its PDF, a preview image and an issuer verification link", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const certs = html.split('<article class="cert">').slice(1).map((c) => c.split("</article>")[0]);
  assert.equal(certs.length, 3);
  for (const c of certs) {
    assert.match(c, /href="certificates\/[a-z-]+\.pdf"/);
    assert.match(c, /<img src="certificates\/[a-z-]+\.jpg" alt="[^"]+" width="\d+" height="\d+"/);
    assert.match(c, /href="https:\/\/(aws\.amazon\.com\/verification|www\.credly\.com\/badges\/[0-9a-f-]+)"/);
  }
});

test("every page links the theme bootstrap before the stylesheet", () => {
  for (const f of htmlFiles) {
    const html = readFileSync(f, "utf8");
    const init = html.indexOf("theme-init.js"), css = html.indexOf("styles.css");
    assert.ok(init > 0 && init < css, f);
  }
});

test("every sample-data row is marked as sample", () => {
  const csv = readFileSync(join(root, "demos/friction/sample-data.csv"), "utf8").trim().split(/\r?\n/).slice(1);
  assert.ok(csv.length > 0);
  for (const line of csv) assert.match(line, /^SAMPLE-\d+,.*SAMPLE DATA/, line);
});
