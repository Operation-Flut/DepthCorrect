'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const testDir = path.join(root, 'com.depthcorrect.zscale.resolve', 'tests');

const testFiles = fs
  .readdirSync(testDir)
  .filter((name) => name.endsWith('.test.js'))
  .map((name) => path.join(testDir, name));

if (testFiles.length === 0) {
  throw new Error('No test files found in ' + testDir);
}

execFileSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit', cwd: root });