import { spawn, ChildProcess, execFile } from 'child_process';

export type AiReviewProvider = 'claude' | 'copilot' | 'codex';

let activeProcess: ChildProcess | null = null;

export interface ReviewCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

interface ReviewRefs {
  sourceRef: string;
  targetRef: string;
}

interface ProviderConfig {
  command: string;
  versionArgs: string[];
  buildArgs: (prompt: string) => string[];
  promptViaStdin: boolean;
  displayName: string;
}

const PROVIDERS: Record<AiReviewProvider, ProviderConfig> = {
  claude: {
    command: 'claude',
    versionArgs: ['--version'],
    buildArgs: () => ['--dangerously-skip-permissions', '-p'],
    promptViaStdin: true,
    displayName: 'Claude',
  },
  copilot: {
    command: 'copilot',
    versionArgs: ['--version'],
    buildArgs: () => ['--yolo', '--silent'],
    promptViaStdin: true,
    displayName: 'Copilot',
  },
  codex: {
    command: 'codex',
    versionArgs: ['--version'],
    buildArgs: () => ['exec', '--dangerously-bypass-approvals-and-sandbox', '-'],
    promptViaStdin: true,
    displayName: 'Codex',
  },
};

export function checkAiReviewCli(provider: AiReviewProvider): Promise<{ available: boolean; version?: string }> {
  const config = PROVIDERS[provider];
  return new Promise((resolve) => {
    execFile(config.command, config.versionArgs, { shell: true }, (err, stdout) => {
      if (err) resolve({ available: false });
      else resolve({ available: true, version: stdout.trim() });
    });
  });
}

function execGit(repoPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: repoPath, maxBuffer: 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message));
      } else {
        resolve();
      }
    });
  });
}

async function fetchRef(repoPath: string, remoteRef: string, localRef: string): Promise<void> {
  await execGit(repoPath, ['fetch', '--prune', 'origin', `+${remoteRef}:${localRef}`]);
}

async function prepareReviewRefs(
  repoPath: string,
  sourceBranch: string,
  targetBranch: string,
  mrIid?: number
): Promise<ReviewRefs> {
  const targetRef = `origin/${targetBranch}`;
  await fetchRef(repoPath, `refs/heads/${targetBranch}`, `refs/remotes/origin/${targetBranch}`);

  if (mrIid) {
    const sourceRef = `origin/merge-requests/${mrIid}/head`;
    try {
      await fetchRef(repoPath, `refs/merge-requests/${mrIid}/head`, `refs/remotes/origin/merge-requests/${mrIid}/head`);
      return { sourceRef, targetRef };
    } catch (err) {
      console.warn(`Failed to fetch MR head ref !${mrIid}; falling back to source branch:`, err);
    }
  }

  const sourceRef = `origin/${sourceBranch}`;
  await fetchRef(repoPath, `refs/heads/${sourceBranch}`, `refs/remotes/origin/${sourceBranch}`);
  return { sourceRef, targetRef };
}

export async function startAiReview(
  provider: AiReviewProvider,
  repoPath: string,
  sourceBranch: string,
  targetBranch: string,
  mrIid: number | undefined,
  mrTitle: string,
  userContext: string,
  callbacks: ReviewCallbacks
): Promise<void> {
  if (activeProcess) cancelAiReview();

  const config = PROVIDERS[provider];
  const { sourceRef, targetRef } = await prepareReviewRefs(repoPath, sourceBranch, targetBranch, mrIid);
  const prompt = buildPrompt(sourceRef, targetRef, sourceBranch, targetBranch, mrTitle, userContext);

  // Use shell:true so Windows can resolve CLI shims like claude.cmd, copilot.cmd, and codex.cmd.
  activeProcess = spawn(config.command, config.buildArgs(prompt), {
    cwd: repoPath,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (config.promptViaStdin) {
    activeProcess.stdin?.write(prompt, 'utf8');
  }
  activeProcess.stdin?.end();

  activeProcess.stdout?.on('data', (chunk: Buffer) =>
    callbacks.onChunk(chunk.toString())
  );
  activeProcess.stderr?.on('data', (chunk: Buffer) =>
    callbacks.onChunk(chunk.toString())
  );

  activeProcess.on('close', (code) => {
    activeProcess = null;
    if (code === 0 || code === null) {
      callbacks.onDone();
    } else {
      callbacks.onError(`${config.displayName} review process exited with code ${code}`);
    }
  });

  activeProcess.on('error', (err: NodeJS.ErrnoException) => {
    activeProcess = null;
    if (err.code === 'ENOENT') {
      callbacks.onError(
        `${config.displayName} CLI not found. Make sure \`${config.command}\` is installed and on your PATH.`
      );
    } else {
      callbacks.onError(err.message);
    }
  });
}

export function cancelAiReview(): void {
  if (activeProcess) {
    activeProcess.kill('SIGTERM');
    activeProcess = null;
  }
}

export function isReviewRunning(): boolean {
  return activeProcess !== null;
}

function buildPrompt(
  sourceRef: string,
  targetRef: string,
  sourceBranch: string,
  targetBranch: string,
  title: string,
  context: string
): string {
  const contextBlock = context.trim()
    ? `\nExtra context from the reviewer:\n${context.trim()}\n`
    : '';

  return `You are doing a code review for a GitLab merge request in this repository.

MR title: ${title}
Branch: ${sourceBranch} -> ${targetBranch}
Fetched refs: ${sourceRef} -> ${targetRef}
${contextBlock}
How to explore the changes (do NOT checkout any branch):
- Run this git command to see all changed files and diffs: git diff ${targetRef}...${sourceRef}
- Run this git command to read a full file at branch state: git show ${sourceRef}:path/to/file
- Run this git command to see the commits: git log ${targetRef}..${sourceRef} --oneline

Review guidelines:
- Be specific: reference file names and line numbers
- Flag bugs, logic errors, security issues, and performance concerns
- Note missing tests or edge cases if relevant
- Keep suggestions actionable and concise
- If the change looks good, say so briefly`;
}
