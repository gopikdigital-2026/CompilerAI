#compdef compiler

_compiler() {
  local -a commands
  commands=(
    'init:Initialize CLI configuration'
    'config:Manage configuration'
    'health:Check platform health'
    'doctor:Run full diagnostics'
    'run:Create an execution from a prompt'
    'executions:Manage executions'
    'workflows:Manage workflows'
    'approvals:Manage approvals'
    'telemetry:View telemetry data'
    'version:Show CLI version'
    'help:Show help'
  )

  local -a global_flags
  global_flags=(
    '--base-url:Override base URL'
    '--api-key:Override API key'
    '--organization-id:Override organization ID'
    '--timeout:Request timeout in ms'
    '--verbose:Show verbose output'
    '--json:Output as JSON'
    '--yes:Skip confirmation prompts'
    '-y:Skip confirmation prompts'
  )

  local context state line
  _arguments -C \
    '1: :->command' \
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      _values 'global flags' "${global_flags[@]}"
      ;;
    args)
      case ${words[1]} in
        config)
          _values 'subcommand' 'set[Set a config value]' 'list[List configuration]'
          ;;
        executions|exec)
          _values 'subcommand' 'list[List executions]' 'get[Get execution]' 'cancel[Cancel execution]'
          ;;
        workflows|wf)
          _values 'subcommand' 'list[List workflows]' 'get[Get workflow]' 'run[Run workflow]'
          ;;
        approvals|apv)
          _values 'subcommand' 'list[List approvals]' 'approve[Approve]' 'reject[Reject]'
          ;;
        telemetry)
          _values 'subcommand' 'trace[Show trace]'
          ;;
        *)
          _values 'global flags' "${global_flags[@]}"
          ;;
      esac
      ;;
  esac
}

_compiler "$@"
