import { ExecutorContext, readJsonFile, writeJsonFile } from '@nrwl/devkit';
import { PackageJson } from 'nx/src/utils/package-json';
import child_process from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import { PublishExecutorSchema } from './schema';
import executor from './executor';

jest.mock('child_process', () => ({
  ...jest.requireActual<typeof child_process>('child_process'),
  exec: jest.fn((cmd: string, cbOrOptions: unknown | (() => unknown), cb?: () => unknown) => {
    typeof cbOrOptions === 'function' ? cbOrOptions() : cb();
  }),
}));

describe('Publish Executor', () => {
  const execMock = jest.mocked(child_process).exec;
  let context: ExecutorContext;
  let testOptions: PublishExecutorSchema;
  let outputPath: string;
  let packageJsonPath: string;
  const workspaces: ReadonlyArray<string> = ['pristine'];

  beforeEach(() => {
    context = {
      root: 'test-root-tmp',
      cwd: 'test-root-tmp',
      workspace: {
        version: 2,
        projects: {
          example: {
            root: 'projects/example',
            projectType: 'application',
          },
        },
        npmScope: 'test',
        workspaceLayout: {
          appsDir: 'projects',
          libsDir: 'libs',
        },
      },
      isVerbose: false,
      projectName: 'example',
      targetName: 'publish',
    };
    testOptions = {
      outputPath: 'dist/projects/example',
    };
    outputPath = path.resolve(context.root, testOptions.outputPath);
    packageJsonPath = path.resolve(context.root, 'package.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(context.root, { recursive: true });
    } catch (e) {
      console.log('failed to clean');
      console.error(e);
    }
    execMock.mockClear();
  });

  async function setupFolders(setupProjectRoot?: boolean, setupOutputPath?: boolean) {
    await fs.mkdir(context.root, { recursive: true });
    writeJsonFile(packageJsonPath, { workspaces });
    if (setupProjectRoot) {
      await fs.mkdir(
        path.resolve(context.root, context.workspace.projects[context.projectName].root),
        { recursive: true }
      );
    }
    if (setupOutputPath) {
      await fs.mkdir(path.resolve(context.root, testOptions.outputPath), { recursive: true });
    }
  }

  it('succeeds on valid inputs', async () => {
    await setupFolders(true, true);

    const output = await executor(testOptions, context);
    expect(output.success).toBe(true);
    expect(execMock).toHaveBeenNthCalledWith(1, `yarn`, expect.any(Function));
    expect(execMock).toHaveBeenNthCalledWith(
      2,
      `yarn npm publish`,
      { cwd: outputPath },
      expect.any(Function)
    );
    expect(execMock).toHaveBeenNthCalledWith(3, `yarn`, expect.any(Function));
    expect(readJsonFile<PackageJson>(packageJsonPath)).toHaveProperty('workspaces', workspaces);
  });

  it('succeeds on valid inputs with tag and access', async () => {
    await setupFolders(true, true);
    testOptions.publishTag = 'alpha';
    testOptions.access = 'restricted';

    const output = await executor(testOptions, context);
    expect(output.success).toBe(true);
    expect(execMock).toHaveBeenNthCalledWith(1, `yarn`, expect.any(Function));
    expect(execMock).toHaveBeenNthCalledWith(
      2,
      `yarn npm publish --tag=alpha --access=restricted`,
      { cwd: outputPath },
      expect.any(Function)
    );
    expect(execMock).toHaveBeenNthCalledWith(3, `yarn`, expect.any(Function));
    expect(readJsonFile<PackageJson>(packageJsonPath)).toHaveProperty('workspaces', workspaces);
  });

  it('errors on invalid project root', async () => {
    await setupFolders();

    const output = await executor(testOptions, context);
    expect(output.success).toBe(false);
  });

  it('errors on invalid output path', async () => {
    await setupFolders(true);

    const output = await executor(testOptions, context);
    expect(output.success).toBe(false);
  });
});
