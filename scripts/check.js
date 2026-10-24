'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
    'README.md',
    'LICENSE',
    'com.depthcorrect.zscale.ae/CSXS/manifest.xml',
    'com.depthcorrect.zscale.ae/README.md',
    'com.depthcorrect.zscale.ae/index.html',
    'com.depthcorrect.zscale.ae/js/main.js',
    'com.depthcorrect.zscale.ae/jsx/host.jsx',
    'com.depthcorrect.zscale.resolve/README.md',
    'com.depthcorrect.zscale.resolve/manifest.xml',
    'com.depthcorrect.zscale.resolve/main.js',
    'com.depthcorrect.zscale.resolve/preload.js',
    'com.depthcorrect.zscale.resolve/index.html',
    'com.depthcorrect.zscale.resolve/js/renderer.js'
];

for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(root, relativePath))) {
        throw new Error('Required project file is missing: ' + relativePath);
    }
}

const javascriptFiles = [
    'com.depthcorrect.zscale.ae/js/main.js',
    'com.depthcorrect.zscale.resolve/main.js',
    'com.depthcorrect.zscale.resolve/preload.js',
    'com.depthcorrect.zscale.resolve/js/renderer.js',
    'com.depthcorrect.zscale.resolve/js/scale.js'
];

for (const relativePath of javascriptFiles) {
    execFileSync(process.execPath, ['--check', path.join(root, relativePath)], { stdio: 'inherit' });
}

const resolveManifest = fs.readFileSync(path.join(root, 'com.depthcorrect.zscale.resolve/manifest.xml'), 'utf8');
if (!/<Id>com\.depthcorrect\.zscale\.resolve<\/Id>/.test(resolveManifest) ||
    !/<FilePath>main\.js<\/FilePath>/.test(resolveManifest)) {
    throw new Error('Resolve plugin manifest is missing its plugin ID or entry point.');
}

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const resolvePackage = JSON.parse(fs.readFileSync(path.join(root, 'com.depthcorrect.zscale.resolve/package.json'), 'utf8'));
const aeManifest = fs.readFileSync(path.join(root, 'com.depthcorrect.zscale.ae/CSXS/manifest.xml'), 'utf8');
const aeBundleVersion = new RegExp('ExtensionBundleVersion="' + rootPackage.version.replace(/\./g, '\\.') + '"');
const aeExtensionVersion = new RegExp('<Extension Id="com\\.depthcorrect\\.zscale\\.panel" Version="' +
    rootPackage.version.replace(/\./g, '\\.') + '"');
if (rootPackage.version !== resolvePackage.version ||
    !aeBundleVersion.test(aeManifest) ||
    !aeExtensionVersion.test(aeManifest)) {
    throw new Error('The root, Resolve, and After Effects versions must match.');
}

const releaseTag = process.env.GITHUB_REF_NAME;
if (releaseTag && /^v\d/.test(releaseTag) && releaseTag !== 'v' + rootPackage.version) {
    throw new Error('Release tag ' + releaseTag + ' does not match package version ' + rootPackage.version + '.');
}

console.log('Repository structure, plugin manifest, and JavaScript syntax are valid.');
