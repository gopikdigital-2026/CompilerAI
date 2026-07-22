import type { Output } from '../output/index.js';
import { ExitCode } from '../config/exit-codes.js';

export function cmdVersion(output: Output): number {
  const version = '1.0.0';
  output.printResult({ version, node: process.versions.node, sdk: '1.0.0' }, () => {
    output.text(`CompilerAI CLI v${version}`);
    output.text(`Node.js ${process.versions.node}`);
    output.text(`SDK: @compilerai/sdk-typescript v1.0.0`);
  });
  return ExitCode.Success;
}
