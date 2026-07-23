import type { ToolManifest, ToolSearchQuery, ToolSearchResult } from '../models/ToolManifest';
import type { IMarketplaceRepository } from './MarketplaceRepository';

export class ToolSearchService {
  constructor(private readonly repo: IMarketplaceRepository) {}

  search(query: ToolSearchQuery): ToolSearchResult[] {
    let tools = this.repo.getAllTools();

    if (query.category) {
      tools = tools.filter((t) => t.category === query.category);
    }

    if (query.verifiedOnly) {
      tools = tools.filter((t) => t.verified);
    }

    if (query.runtime) {
      tools = tools.filter((t) => t.runtimeCompatibility.includes(query.runtime!));
    }

    let results: ToolSearchResult[];

    if (query.text && query.text.trim().length > 0) {
      const searchText = query.text.toLowerCase();
      results = tools
        .map((tool) => {
          const matchedFields: string[] = [];
          let score = 0;

          if (tool.name.toLowerCase().includes(searchText)) {
            matchedFields.push('name');
            score += 10;
            if (tool.name.toLowerCase() === searchText) score += 15;
          }
          if (tool.id.toLowerCase().includes(searchText)) {
            matchedFields.push('id');
            score += 8;
          }
          if (tool.description.toLowerCase().includes(searchText)) {
            matchedFields.push('description');
            score += 5;
          }
          if (tool.capabilities.some((c) => c.toLowerCase().includes(searchText))) {
            matchedFields.push('capabilities');
            score += 6;
          }
          if (tool.author.toLowerCase().includes(searchText)) {
            matchedFields.push('author');
            score += 3;
          }

          return { tool, score, matchedFields };
        })
        .filter((r) => r.score > 0);
    } else {
      results = tools.map((tool) => ({ tool, score: 1, matchedFields: [] }));
    }

    const sortBy = query.sortBy ?? 'relevance';
    switch (sortBy) {
      case 'name':
        results.sort((a, b) => a.tool.name.localeCompare(b.tool.name));
        break;
      case 'version':
        results.sort((a, b) => b.tool.version.localeCompare(a.tool.version));
        break;
      case 'relevance':
        results.sort((a, b) => b.score - a.score);
        break;
      default:
        results.sort((a, b) => b.score - a.score);
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  suggest(partial: string, limit = 5): ToolManifest[] {
    if (partial.trim().length === 0) return [];
    const search = partial.toLowerCase();
    return this.repo
      .getAllTools()
      .filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.id.toLowerCase().includes(search) ||
          t.capabilities.some((c) => c.toLowerCase().includes(search)),
      )
      .slice(0, limit);
  }
}
