Register-ArgumentCompleter -Native -CommandName 'compiler' -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $commandElements = $commandAst.CommandElements
  $command = @(
    'compiler'
    for ($i = 1; $i -lt $commandElements.Count; $i++) {
      $element = $commandElements[$i]
      if ($element -isnot [StringConstantExpressionAst] -or
          $element.Value.StartsWith('-')) {
        break
      }
      $element.Value
    }
  ) -join ';'

  $completions = @(switch ($command) {
    'compiler' {
      [CompletionResult]::new('--json', '--json', [CompletionResultType]::ParameterName, 'Output as JSON')
      [CompletionResult]::new('--verbose', '--verbose', [CompletionResultType]::ParameterName, 'Verbose output')
      [CompletionResult]::new('--yes', '--yes', [CompletionResultType]::ParameterName, 'Skip confirmations')
      [CompletionResult]::new('-y', '-y', [CompletionResultType]::ParameterName, 'Skip confirmations')
      [CompletionResult]::new('--base-url', '--base-url', [CompletionResultType]::ParameterName, 'Override base URL')
      [CompletionResult]::new('--api-key', '--api-key', [CompletionResultType]::ParameterName, 'Override API key')
      [CompletionResult]::new('--organization-id', '--organization-id', [CompletionResultType]::ParameterName, 'Override org ID')
      [CompletionResult]::new('--timeout', '--timeout', [CompletionResultType]::ParameterName, 'Timeout in ms')
      [CompletionResult]::new('init', 'init', [CompletionResultType]::ParameterValue, 'Initialize configuration')
      [CompletionResult]::new('config', 'config', [CompletionResultType]::ParameterValue, 'Manage configuration')
      [CompletionResult]::new('health', 'health', [CompletionResultType]::ParameterValue, 'Check platform health')
      [CompletionResult]::new('doctor', 'doctor', [CompletionResultType]::ParameterValue, 'Run diagnostics')
      [CompletionResult]::new('run', 'run', [CompletionResultType]::ParameterValue, 'Create execution')
      [CompletionResult]::new('executions', 'executions', [CompletionResultType]::ParameterValue, 'Manage executions')
      [CompletionResult]::new('workflows', 'workflows', [CompletionResultType]::ParameterValue, 'Manage workflows')
      [CompletionResult]::new('approvals', 'approvals', [CompletionResultType]::ParameterValue, 'Manage approvals')
      [CompletionResult]::new('telemetry', 'telemetry', [CompletionResultType]::ParameterValue, 'View telemetry')
      [CompletionResult]::new('version', 'version', [CompletionResultType]::ParameterValue, 'Show version')
      [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Show help')
    }
    'compiler;config' {
      [CompletionResult]::new('set', 'set', [CompletionResultType]::ParameterValue, 'Set config value')
      [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List configuration')
    }
    'compiler;executions' {
      [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List executions')
      [CompletionResult]::new('get', 'get', [CompletionResultType]::ParameterValue, 'Get execution')
      [CompletionResult]::new('cancel', 'cancel', [CompletionResultType]::ParameterValue, 'Cancel execution')
    }
    'compiler;workflows' {
      [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List workflows')
      [CompletionResult]::new('get', 'get', [CompletionResultType]::ParameterValue, 'Get workflow')
      [CompletionResult]::new('run', 'run', [CompletionResultType]::ParameterValue, 'Run workflow')
    }
    'compiler;approvals' {
      [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List approvals')
      [CompletionResult]::new('approve', 'approve', [CompletionResultType]::ParameterValue, 'Approve')
      [CompletionResult]::new('reject', 'reject', [CompletionResultType]::ParameterValue, 'Reject')
    }
    'compiler;telemetry' {
      [CompletionResult]::new('trace', 'trace', [CompletionResultType]::ParameterValue, 'Show trace')
    }
  })

  $completions.Where{ $_.CompletionText -like "$wordToComplete*" } |
    Sort-Object -Property ListItemText
}
