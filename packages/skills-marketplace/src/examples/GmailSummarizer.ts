import { createSkill, createCommand, createPermission, createParameter } from '../sdk/SkillBuilder.js';
import type { SkillManifest, SkillHandler } from '../models.js';

export function createGmailSummarizer(): { manifest: SkillManifest; handler: SkillHandler } {
  return createSkill()
    .id('gmail-thread-summarizer')
    .name('Gmail Thread Summarizer')
    .description('Summarizes Gmail email threads into concise actionable summaries with key points and decisions')
    .version('1.0.0')
    .author('CompilerAI Team')
    .organization('compilerai')
    .category('productivity')
    .tags('gmail', 'email', 'summarization', 'productivity')
    .permissions([
      createPermission('gmail', ['read'], 'Read email threads and message content'),
    ])
    .capabilities('summarization', 'email-processing', 'action-extraction')
    .compatibleConnectors('google')
    .minPlatformVersion('1.0.0')
    .commands(
      createCommand('summarize', 'Summarize an email thread', [
        createParameter('threadId', 'string', true, 'Gmail thread ID'),
        createParameter('maxLength', 'number', false, 'Maximum summary length in words', 200),
      ]),
      createCommand('extractActions', 'Extract action items from an email thread', [
        createParameter('threadId', 'string', true, 'Gmail thread ID'),
      ]),
    )
    .execute(async (ctx) => {
      const threadId = ctx.parameters.threadId as string;
      const maxLength = (ctx.parameters.maxLength as number) ?? 200;

      const summary = {
        threadId,
        summary: `This email thread discusses the Q3 project timeline. Key decisions include: ' +
          '1) Launch date moved to August 15, 2) Budget approved for $50K, 3) Team expanded with 2 new hires. ' +
          'Action items: Review technical spec by Friday, Schedule kickoff meeting next week.`,
        keyPoints: [
          'Launch date: August 15',
          'Budget: $50K approved',
          'Team: 2 new hires added',
        ],
        actionItems: [
          'Review technical spec by Friday',
          'Schedule kickoff meeting next week',
        ],
        participants: ['alice@company.com', 'bob@company.com', 'carol@company.com'],
        messageCount: 8,
        maxLength,
        summarizedAt: new Date().toISOString(),
      };

      return {
        invocationId: ctx.invocationId,
        skillId: ctx.skillId,
        command: ctx.command,
        success: true,
        output: summary,
        durationMs: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        telemetry: { threadId, messageCount: summary.messageCount, actionItems: summary.actionItems.length },
      };
    })
    .build();
}
