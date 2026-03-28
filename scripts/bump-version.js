#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const type = process.argv[2];

if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: node bump-version.js <major|minor|patch>');
    process.exit(1);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const manifestPath = path.join(__dirname, '..', 'manifest.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (pkg.version !== manifest.version) {
    console.log(`版本不一致，同步 manifest.json: ${manifest.version} → ${pkg.version}`);
    manifest.version = pkg.version;
}

const [major, minor, patch] = pkg.version.split('.').map(Number);

let newVersion;
switch (type) {
    case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
}

pkg.version = newVersion;
manifest.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');

console.log(`版本更新: ${pkg.version.split('.').slice(0, -1).join('.')}.* → ${newVersion}`);

try {
    console.log('\n执行 Git 操作...');
    
    execSync('git add package.json manifest.json', { stdio: 'inherit' });
    
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
    
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    
    execSync('git push origin main --tags', { stdio: 'inherit' });
    
    console.log(`\n✅ 成功发布版本 v${newVersion}`);
    console.log(`GitHub Release 将自动创建: https://github.com/alislin/logseq-todos-in-obsidian/releases/tag/v${newVersion}`);
} catch (error) {
    console.error('\n❌ Git 操作失败，请手动执行：');
    console.error('  git add package.json manifest.json');
    console.error(`  git commit -m "chore: bump version to ${newVersion}"`);
    console.error(`  git tag v${newVersion}`);
    console.error('  git push origin main --tags');
    process.exit(1);
}