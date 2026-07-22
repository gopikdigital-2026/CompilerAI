_compilerai_completions() {
  local cur prev words cword
  _init_completion || return

  local commands="init config health doctor run executions workflows approvals telemetry version help"
  local config_sub="set list"
  local exec_sub="list get cancel"
  local wf_sub="list get run"
  local apv_sub="list approve reject"
  local tel_sub="trace"
  local global_flags="--base-url --api-key --organization-id --timeout --verbose --json --yes -y -h --help -v --version"

  if [ $cword -eq 1 ]; then
    COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    return 0
  fi

  case "${words[1]}" in
    config)
      if [ $cword -eq 2 ]; then
        COMPREPLY=($(compgen -W "$config_sub" -- "$cur"))
        return 0
      fi
      ;;
    executions|exec)
      if [ $cword -eq 2 ]; then
        COMPREPLY=($(compgen -W "$exec_sub" -- "$cur"))
        return 0
      fi
      ;;
    workflows|wf)
      if [ $cword -eq 2 ]; then
        COMPREPLY=($(compgen -W "$wf_sub" -- "$cur"))
        return 0
      fi
      ;;
    approvals|apv)
      if [ $cword -eq 2 ]; then
        COMPREPLY=($(compgen -W "$apv_sub" -- "$cur"))
        return 0
      fi
      ;;
    telemetry)
      if [ $cword -eq 2 ]; then
        COMPREPLY=($(compgen -W "$tel_sub" -- "$cur"))
        return 0
      fi
      ;;
  esac

  COMPREPLY=($(compgen -W "$global_flags" -- "$cur"))
  return 0
}

complete -F _compilerai_completions compiler
