# @compilerai/cli

Official CompilerAI CLI — intelligent business workflow compilation from the terminal.

## Installation

```bash
npm install -g @compilerai/cli
```

## Quick Start

```bash
# Initialize configuration
compiler init

# Check platform health
compiler health

# Run a prompt
compiler run "Analyze quarterly revenue and propose actions"

# List workflows
compiler workflows list

# Get JSON output for scripting
compiler workflows list --json | jq '.[0].workflowId'
```

## Commands

See [docs/commands.md](docs/commands.md) for the full command reference.

## Global Flags

| Flag | Description |
|------|-------------|
| `--base-url <url>` | Override configured base URL |
| `--api-key <key>` | Override configured API key |
| `--organization-id <id>` | Override configured organization ID |
| `--timeout <ms>` | Request timeout in milliseconds |
| `--verbose` | Show verbose output (to stderr) |
| `--json` | Output as JSON (to stdout) |
| `--yes, -y` | Skip confirmation prompts |

## Shell Completions

### Bash

```bash
source completions/compiler.bash
# Or add to ~/.bashrc:
echo 'source /path/to/completions/compiler.bash' >> ~/.bashrc
```

### Zsh

```bash
source completions/compiler.zsh
# Or add to ~/.zshrc:
echo 'source /path/to/completions/compiler.zsh' >> ~/.zshrc
```

### PowerShell

```powershell
Invoke-Expression -Command completions/compiler.ps1
# Or add to your PowerShell profile
```

## Configuration

Configuration is stored at `~/.compilerai/config.json` with file permissions `600`.

```bash
compiler init              # Interactive setup
compiler config set apiKey my-key
compiler config set organizationId org_123
compiler config set baseUrl http://localhost:3000
compiler config set timeoutMs 10000
compiler config list       # Show config (API key is redacted)
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic error |
| 2 | Configuration error |
| 3 | Authentication error |
| 4 | Not found |
| 5 | Validation error |
| 6 | Network/rate limit error |
| 7 | Cancelled by user |
| 8 | Timeout |

## Security

- API keys are never displayed in full (masked as `xxxx****xxxx`)
- Config file has `0600` permissions
- No secrets in error messages
- Confirmation required for destructive actions (cancel, approve, reject)
- `--yes` flag for automation bypasses confirmations

## License

MIT
