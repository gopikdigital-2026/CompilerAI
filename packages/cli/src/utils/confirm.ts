import { createInterface } from 'node:readline';

export async function confirm(message: string, skip: boolean = false): Promise<boolean> {
  if (skip) return true;
  if (!process.stdin.isTTY) {
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise<boolean>((resolve) => {
    rl.question(`\x1b[33m? ${message} (y/N) \x1b[0m`, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}
