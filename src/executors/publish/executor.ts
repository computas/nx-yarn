import { ExecutorContext, logger } from '@nrwl/devkit';
import { updateJsonFile } from '@nrwl/workspace';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PackageJson } from 'nx/src/utils/package-json';

import { PublishExecutorSchema } from './schema';

const execAsync = promisify(exec);

export default async function executor(
  { outputPath, publishTag, access }: PublishExecutorSchema,
  context: ExecutorContext
) {
  const projectRoot = path.resolve(
    context.root,
    context.workspace.projects[context.projectName].root
  );
  const outputPathAbsolute = path.resolve(context.root, outputPath);

  try {
    await ensureIsDir(projectRoot);
  } catch (e) {
    logger.fatal('Invalid project root!');
    if (context.isVerbose) {
      logger.fatal('Inner error:', e);
    }
    return { success: false };
  }
  try {
    await ensureIsDir(outputPathAbsolute);
  } catch (e) {
    logger.fatal('Invalid outputPath!');
    if (context.isVerbose) {
      logger.fatal('Inner error:', e);
    }
    return { success: false };
  }

  let success = true;
  let packageJsonUpdated = false;
  let workspaces: string[] | { packages: string[] };
  try {
    updateJsonFile(path.resolve(context.root, 'package.json'), (packageJson: PackageJson) => {
      ({ workspaces } = packageJson);
      packageJson.workspaces = [outputPath];
      return packageJson;
    });
    packageJsonUpdated = true;

    await execAsync('yarn');

    let cmd = `yarn npm publish`;
    if (publishTag) {
      cmd += ` --tag=${publishTag}`;
    }
    if (access) {
      cmd += ` --access=${access}`;
    }
    await execAsync(cmd, { cwd: outputPathAbsolute });
  } catch (e) {
    logger.fatal(e);
    success = false;
  } finally {
    if (packageJsonUpdated) {
      updateJsonFile(path.resolve(context.root, 'package.json'), (packageJson: PackageJson) => {
        packageJson.workspaces = workspaces;
        return packageJson;
      });
      await execAsync('yarn');
    }
  }
  return {
    success,
  };
}

async function ensureIsDir(dir: string) {
  if (!(await fs.stat(dir)).isDirectory()) {
    throw new Error(`${dir} is not a directory`);
  }
}
