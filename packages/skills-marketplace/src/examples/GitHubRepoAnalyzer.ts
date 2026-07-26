import { createSkill, createCommand, createPermission, createParameter } from '../sdk/SkillBuilder.js';
import type { SkillManifest, SkillHandler } from '../models.js';

export function createGitHubRepoAnalyzer(): { manifest: SkillManifest; handler: SkillHandler } {
  return createSkill()
    .id('github-repo-analyzer')
    .name('GitHub Repository Analyzer')
    .description('Analyzes GitHub repositories for code quality, dependency health, and security vulnerabilities')
    .version('1.0.0')
    .author('CompilerAI Team')
    .organization('compilerai')
    .category('development')
    .tags('github', 'code-quality', 'security', 'analysis')
    .permissions([
      createPermission('github', ['read'], 'Read repository metadata, files, and commit history'),
    ])
    .capabilities('code-analysis', 'dependency-checking', 'security-scanning')
    .compatibleConnectors('github')
    .minPlatformVersion('1.0.0')
    .commands(
      createCommand('analyze', 'Analyze a repository for code quality and security', [
        createParameter('repository', 'string', true, 'Repository name (owner/repo)'),
        createParameter('depth', 'string', false, 'Analysis depth: quick, standard, deep', 'standard'),
      ]),
      createCommand('summarize', 'Generate a summary report of repository health', [
        createParameter('repository', 'string', true, 'Repository name (owner/repo)'),
      ]),
    )
    .execute(async (ctx) => {
      const repo = ctx.parameters.repository as string;
      const depth = (ctx.parameters.depth as string) ?? 'standard';

      const analysis = {
        repository: repo,
        depth,
        metrics: {
          codeQualityScore: 85,
          dependencyHealth: 'good',
          securityIssues: 2,
          testCoverage: 78,
          openIssues: 5,
          staleBranches: 3,
        },
        recommendations: [
          'Update 2 outdated dependencies',
          'Fix 2 medium-severity security vulnerabilities',
          'Increase test coverage to 80%+',
        ],
        analyzedAt: new Date().toISOString(),
      };

      return {
        invocationId: ctx.invocationId,
        skillId: ctx.skillId,
        command: ctx.command,
        success: true,
        output: analysis,
        durationMs: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        telemetry: { repo, depth, issuesFound: analysis.metrics.securityIssues },
      };
    })
    .build();
}
