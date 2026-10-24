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
    'DepthCorrect/DepthCorrect.py'
];

for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(root, relativePath))) {
        throw new Error('Required project file is missing: ' + relativePath);
    }
}

const javascriptFiles = [
    'com.depthcorrect.zscale.ae/js/main.js'
];

for (const relativePath of javascriptFiles) {
    execFileSync(process.execPath, ['--check', path.join(root, relativePath)], { stdio: 'inherit' });
}

const python = process.env.PYTHON || 'python';
try {
    execFileSync(python, ['-m', 'py_compile', path.join(root, 'DepthCorrect/DepthCorrect.py')], {
        stdio: 'inherit',
        cwd: root
    });
} catch (error) {
    throw new Error('Python syntax check failed. Set PYTHON to a Python 3 executable if needed.', { cause: error });
}

const aeManifest = fs.readFileSync(
    path.join(root, 'com.depthcorrect.zscale.ae/CSXS/manifest.xml'),
    'utf8'
);
const rootPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const aeBundleVersion = new RegExp(
    'ExtensionBundleVersion="' + rootPackage.version.replace(/\./g, '\\.') + '"'
);
const aeExtensionVersion = new RegExp(
    '<Extension Id="com\\.depthcorrect\\.zscale\\.panel" Version="' +
    rootPackage.version.replace(/\./g, '\\.') + '"'
);
if (!aeBundleVersion.test(aeManifest) || !aeExtensionVersion.test(aeManifest)) {
    throw new Error('The After Effects manifest version does not match package.json.');
}

const releaseTag = process.env.GITHUB_REF_NAME;
if (releaseTag && /^v\d/.test(releaseTag) && releaseTag !== 'v' + rootPackage.version) {
    throw new Error('Release tag ' + releaseTag + ' does not match package version ' + rootPackage.version + '.');
}

console.log('Repository structure, script syntax, and After Effects manifest are valid.');
