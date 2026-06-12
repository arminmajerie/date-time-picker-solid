const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const rootPackageJsonPath = path.join(rootDir, 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function expandWorkspacePackageFiles(entries) {
  const packageFiles = [];

  for (const entry of entries) {
    if (entry.includes('*')) {
      const parentDir = path.join(rootDir, entry.replace(/\/\*$/, '').replace(/\*$/, ''));

      if (!fs.existsSync(parentDir)) {
        continue;
      }

      for (const dirent of fs.readdirSync(parentDir, { withFileTypes: true })) {
        if (!dirent.isDirectory()) {
          continue;
        }

        const filePath = path.join(parentDir, dirent.name, 'package.json');
        if (fs.existsSync(filePath)) {
          packageFiles.push(filePath);
        }
      }

      continue;
    }

    const filePath = path.join(rootDir, entry, 'package.json');
    if (fs.existsSync(filePath)) {
      packageFiles.push(filePath);
    }
  }

  return packageFiles;
}

const targetVersion =
  process.env.npm_new_version || process.env.npm_config_version || process.argv[2];

if (!targetVersion) {
  console.error('Usage: npm run version -- <version>');
  process.exit(1);
}

const rootPackageJson = readJson(rootPackageJsonPath);
const workspaceEntries = Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : [];

const workspacePackages = expandWorkspacePackageFiles(workspaceEntries).map((filePath) => ({
  filePath,
  packageJson: readJson(filePath),
}));

const publishablePackages = workspacePackages.filter(
  ({ packageJson }) => packageJson.private !== true && typeof packageJson.name === 'string',
);

const internalPackageNames = new Set(
  publishablePackages.map(({ packageJson }) => packageJson.name),
);

for (const workspace of publishablePackages) {
  workspace.packageJson.version = targetVersion;
}

for (const workspace of workspacePackages) {
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const dependencies = workspace.packageJson[section];
    if (!dependencies) {
      continue;
    }

    for (const dependencyName of Object.keys(dependencies)) {
      if (internalPackageNames.has(dependencyName)) {
        dependencies[dependencyName] = targetVersion;
      }
    }
  }
}

for (const workspace of workspacePackages) {
  writeJson(workspace.filePath, workspace.packageJson);
}

console.log(`Set workspace version to ${targetVersion}`);
