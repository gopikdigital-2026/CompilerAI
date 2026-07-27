import type {
  AnalysisResult,
  ExecutiveReportData,
} from '../types/analysis';
import type { Roadmap } from './roadmapEngine';

export type ExportFormat = 'pdf' | 'word' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  orgName: string;
  date: string;
  includeExecSummary: boolean;
  includeHealthScore: boolean;
  includeEvidence: boolean;
  includeRisks: boolean;
  includeOpportunities: boolean;
  includeRoadmap: boolean;
  includeActionPlan: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'pdf',
  orgName: '',
  date: new Date().toISOString(),
  includeExecSummary: true,
  includeHealthScore: true,
  includeEvidence: true,
  includeRisks: true,
  includeOpportunities: true,
  includeRoadmap: true,
  includeActionPlan: true,
};

export function generateMarkdownReport(
  analysisResult: AnalysisResult,
  execReport: ExecutiveReportData | null,
  roadmap: Roadmap | null,
  options: ExportOptions,
): string {
  const lines: string[] = [];
  const date = new Date(options.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  lines.push(`# Informe Ejecutivo — ${options.orgName}`);
  lines.push(`**Fecha:** ${date}`);
  lines.push(`**Versión del motor:** ${analysisResult.engineVersion}`);
  lines.push('');

  if (options.includeExecSummary && execReport) {
    lines.push('## Resumen Ejecutivo');
    lines.push('');
    const r = execReport.report;
    lines.push(`### ¿Qué ocurre?`);
    lines.push(r.what.answer);
    lines.push('');
    lines.push(`### ¿Por qué ocurre?`);
    lines.push(r.why.answer);
    lines.push('');
    lines.push(`### ¿Qué impacto tiene?`);
    lines.push(r.impact.answer);
    lines.push('');
    lines.push(`### ¿Qué deberíamos hacer?`);
    lines.push(r.whatToDo.answer);
    lines.push('');
    lines.push(`### ¿Qué pasará si no hacemos nada?`);
    lines.push(r.whatHappensIfNothing.answer);
    lines.push('');
    lines.push(`**Próxima mejor acción:** ${execReport.nextBestAction}`);
    lines.push('');
    lines.push(`**Impacto económico:** ${execReport.economicImpact}`);
    lines.push('');
  }

  if (options.includeHealthScore && execReport) {
    const hs = execReport.healthScore;
    lines.push('## Health Score');
    lines.push('');
    lines.push(`**Puntuación:** ${hs.score}/100 (${hs.label})`);
    lines.push(`**Tendencia:** ${hs.trend}`);
    lines.push(`**Confianza:** ${hs.confidence}%`);
    lines.push('');
    lines.push('### Dimensiones');
    lines.push('| Dimensión | Puntuación | Peso | Confianza | Fuentes |');
    lines.push('|---|---|---|---|---|');
    for (const d of hs.dimensions) {
      lines.push(`| ${d.label} | ${d.score} | ${Math.round(d.weight * 100)}% | ${d.confidence}% | ${d.sources.join(', ')} |`);
    }
    lines.push('');
    lines.push(`**Método de cálculo:** ${hs.calculationMethod}`);
    lines.push('');
  }

  if (options.includeRisks) {
    lines.push('## Riesgos');
    lines.push('');
    if (analysisResult.risks.length > 0) {
      for (const r of analysisResult.risks) {
        lines.push(`- ${r}`);
      }
    } else {
      lines.push('Sin riesgos detectados.');
    }
    lines.push('');
  }

  if (options.includeOpportunities) {
    lines.push('## Oportunidades');
    lines.push('');
    for (const opp of analysisResult.opportunities) {
      lines.push(`### ${opp.title}`);
      lines.push(`- **Prioridad:** ${opp.priority}`);
      lines.push(`- **Confianza:** ${opp.confidence}%`);
      lines.push(`- **Impacto:** ${opp.impact}`);
      lines.push(`- **Esfuerzo:** ${opp.effort}`);
      lines.push(`- **ROI:** ${opp.estimated_roi}`);
      lines.push(`- **Impacto económico:** ${opp.economicImpact}`);
      lines.push(`- **Impacto operativo:** ${opp.operationalImpact}`);
      lines.push(`- **Riesgo:** ${opp.risk}`);
      lines.push(`- **Tiempo de implantación:** ${opp.implementationTime}`);
      lines.push(`- **Dependencias:** ${opp.dependencies.length > 0 ? opp.dependencies.join(', ') : 'Sin dependencias'}`);
      lines.push(`- **Estado:** ${opp.status}`);
      lines.push(`- **Fuente:** ${opp.source}`);
      lines.push('');
      if (options.includeEvidence && opp.evidence.length > 0) {
        lines.push('#### Evidencias');
        for (const ev of opp.evidence) {
          lines.push(`- **Fuente:** ${ev.connector}`);
          lines.push(`- **Métrica:** ${ev.dataUsed}`);
          if (ev.observedValue) lines.push(`- **Observado:** ${ev.observedValue}`);
          if (ev.expectedValue) lines.push(`- **Esperado:** ${ev.expectedValue}`);
          lines.push(`- **Calidad:** ${ev.quality}`);
          lines.push(`- **Confianza:** ${ev.confidence}%`);
          lines.push('');
        }
      }
    }
  }

  if (options.includeRoadmap && roadmap) {
    lines.push('## Roadmap');
    lines.push('');
    for (const phase of roadmap.phases) {
      lines.push(`### ${phase.label}`);
      lines.push(`**Objetivo:** ${phase.objective}`);
      lines.push('');
      lines.push('**Acciones:**');
      for (const a of phase.actions) {
        lines.push(`- ${a}`);
      }
      lines.push('');
      lines.push(`**Impacto esperado:** ${phase.expectedImpact}`);
      lines.push(`**Responsable sugerido:** ${phase.suggestedOwner}`);
      if (phase.risks.length > 0) {
        lines.push('**Riesgos:**');
        for (const r of phase.risks) { lines.push(`- ${r}`); }
      }
      if (phase.dependencies.length > 0) {
        lines.push('**Dependencias:**');
        for (const d of phase.dependencies) { lines.push(`- ${d}`); }
      }
      lines.push('');
    }
  }

  if (options.includeActionPlan) {
    lines.push('## Plan de Acción');
    lines.push('');
    for (const opp of analysisResult.opportunities) {
      lines.push(`- [${opp.status === 'completed' ? 'x' : ' '}] ${opp.title} — ${opp.priority}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Informe generado por CompilerAI el ${date} para ${options.orgName}.*`);

  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportReport(
  analysisResult: AnalysisResult,
  execReport: ExecutiveReportData | null,
  roadmap: Roadmap | null,
  options: ExportOptions,
) {
  const markdown = generateMarkdownReport(analysisResult, execReport, roadmap, options);
  const dateStr = new Date().toISOString().split('T')[0];
  const baseName = `informe-ejecutivo-${options.orgName.toLowerCase().replace(/\s+/g, '-')}-${dateStr}`;

  switch (options.format) {
    case 'markdown':
      downloadFile(markdown, `${baseName}.md`, 'text/markdown');
      break;
    case 'pdf':
      // PDF: use a printable HTML approach
      const html = markdownToHtml(markdown, options.orgName);
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      const printWin = window.open(htmlUrl, '_blank');
      if (printWin) {
        printWin.onload = () => {
          printWin.print();
        };
      }
      URL.revokeObjectURL(htmlUrl);
      break;
    case 'word':
      // Word: generate an HTML file with .doc extension
      const wordHtml = markdownToHtml(markdown, options.orgName);
      downloadFile(wordHtml, `${baseName}.doc`, 'application/msword');
      break;
  }
}

function markdownToHtml(markdown: string, orgName: string): string {
  const html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split('|').filter((c) => c.trim());
      if (cells.every((c) => /^[\s-]+$/.test(c))) return '';
      return `<tr>${cells.map((c) => `<td>${c.trim()}</td>`).join('')}</tr>`;
    })
    .replace(/^(- .+)$/gm, '<li>$1</li>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- \[(.)\] (.+)$/gm, '<li>[$1] $2</li>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Informe Ejecutivo — ${orgName}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
  h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
  h2 { color: #4f46e5; margin-top: 30px; }
  h3 { color: #6b7280; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  td { border: 1px solid #ddd; padding: 8px; }
  tr:first-child { background: #f5f5f5; font-weight: bold; }
  li { margin: 4px 0; }
  strong { color: #111; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
${html}
</body>
</html>`;
}
