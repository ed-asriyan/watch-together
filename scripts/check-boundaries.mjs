#!/usr/bin/env node
/**
 * Cheap structural guard until dependency-cruiser lands (migration step 0).
 *
 * Enforces the one rule the whole design rests on: the model is pure. It may
 * not reach outwards to a port, and it may not read ambient state — no clock,
 * no randomness, no timers, no storage, no network. If it cannot read a clock,
 * every timestamp must be passed in, which is what makes the synchronization
 * logic testable at all.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src/domains';

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : [];
});

const FRAMEWORKS = /from\s+['"](svelte|firebase|vidstack|webtorrent|@sentry|@amplitude)/;
const AMBIENT = /\b(Date\.now|Math\.random|setTimeout|setInterval|localStorage|sessionStorage|fetch)\s*\(/;
const REACHES_OUT = /from\s+['"][^'"]*\/ports\//;

const violations = [];
for (const file of walk(ROOT)) {
    const rel = relative('.', file);
    const inModel = /\/model\//.test(file);
    const source = readFileSync(file, 'utf8');

    source.split('\n').forEach((line, i) => {
        const at = `${rel}:${i + 1}`;
        if (FRAMEWORKS.test(line)) violations.push(`${at} imports a framework or SDK`);
        if (inModel && REACHES_OUT.test(line)) violations.push(`${at} model imports a port`);
        if (inModel && AMBIENT.test(line) && !line.trimStart().startsWith('*')) {
            violations.push(`${at} model reads ambient state (clock, randomness, timer, storage or network)`);
        }
    });
}

if (violations.length) {
    console.error('Boundary violations:\n' + violations.map((v) => '  ' + v).join('\n'));
    process.exit(1);
}
console.log(`Boundaries OK (${walk(ROOT).length} files).`);
