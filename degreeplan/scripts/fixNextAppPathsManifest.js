const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const sourcePath = path.join(nextDir, 'app-path-routes-manifest.json');
const targetPath = path.join(nextDir, 'server', 'app-paths-manifest.json');

if (!fs.existsSync(sourcePath) || !fs.existsSync(path.dirname(targetPath))) {
  process.exit(0);
}

const routeManifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const appPathsManifest = {};

for (const appPath of Object.keys(routeManifest)) {
  const serverFile = `app/${appPath.replace(/^\/+/, '')}.js`.replace(/\\/g, '/');
  const absoluteServerFile = path.join(nextDir, 'server', serverFile);

  if (fs.existsSync(absoluteServerFile)) {
    appPathsManifest[appPath] = serverFile;
  }
}

if (Object.keys(appPathsManifest).length > 0) {
  fs.writeFileSync(targetPath, `${JSON.stringify(appPathsManifest, null, 2)}\n`);
  console.log(`Fixed Next app paths manifest with ${Object.keys(appPathsManifest).length} routes.`);
}
