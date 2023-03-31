import fs from "fs";
import glob from "glob";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = process.cwd();
const packageFiles = findWorkspacePackageFiles(rootDir);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scopes = packageFiles.reduce((scopes, packageFile) => {
  try {
    const packageData = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    const dependencies = packageData.dependencies || {};
    const scopeDeps = Object.keys(dependencies)
      .filter((dep) => dep.startsWith("@"))
      .map((dep) => dep.split("/")[0]);
    scopes.push(...new Set(scopeDeps));
  } catch (error) {
    console.error(
      `Error reading package file ${packageFile}: ${error.message}`
    );
  }
  return scopes;
}, []);

const uniqueScopes = [...new Set(scopes)];

const packageRules = uniqueScopes.map((scope) => ({
  matchPackagePatterns: [`${scope}/*`],
  groupName: `${scope} packages`,
}));

const warningComment = `
// This file is generated automatically by a script.
// Please do not edit this file manually.
`;

const renovateConfig = {
  extends: ["config:base"],
  packageRules,
};

const renovateConfigFile = path.join(__dirname, "../gen/renovate.npm.gen.json");
fs.writeFile(
  renovateConfigFile,
  warningComment + JSON.stringify(renovateConfig, null, 2),
  (err) => {
    if (err) {
      console.error(`Error writing Renovate config file: ${err.message}`);
    } else {
      console.log(`Renovate config file written to ${renovateConfigFile}`);
    }
  }
);

function findWorkspacePackageFiles(dir) {
  const packageFiles = [];
  const rootPackageFile = path.join(dir, "package.json");
  if (!fs.existsSync(rootPackageFile)) {
    return packageFiles;
  }
  const packageData = JSON.parse(fs.readFileSync(rootPackageFile, "utf8"));
  const workspaces = packageData.workspaces;
  if (!workspaces || !workspaces.packages) {
    return packageFiles;
  }
  workspaces.packages.forEach((workspacePath) => {
    const workspaceFiles = glob.sync(`${workspacePath}/package.json`, {
      cwd: dir,
    });
    packageFiles.push(...workspaceFiles.map((file) => path.join(dir, file)));
  });
  return packageFiles;
}
