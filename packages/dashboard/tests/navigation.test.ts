import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routes, sidebarRoutes, searchableRoutes } from '../src/routes/routes.ts';

describe('Navigation — route structure', () => {
  it('should define exactly 10 routes', () => {
    assert.equal(routes.length, 10);
  });

  it('should have a root overview route', () => {
    const root = routes.find((r) => r.path === '/');
    assert.ok(root, 'root route must exist');
    assert.equal(root!.label, 'Overview');
  });

  it('should have an executions route', () => {
    const exec = routes.find((r) => r.path === '/executions');
    assert.ok(exec, 'executions route must exist');
    assert.equal(exec!.label, 'Execution Explorer');
  });

  it('should have an execution detail route with :executionId param', () => {
    const detail = routes.find((r) => r.path === '/executions/:executionId');
    assert.ok(detail, 'execution detail route must exist');
    assert.equal(detail!.label, 'Execution Detail');
  });

  it('should have a trace viewer route', () => {
    const trace = routes.find((r) => r.path === '/executions/:executionId/trace');
    assert.ok(trace, 'trace viewer route must exist');
    assert.equal(trace!.label, 'Trace Viewer');
  });

  it('should have sidebar routes with labels', () => {
    assert.ok(sidebarRoutes.length >= 7, 'should have at least 7 sidebar routes');
    sidebarRoutes.forEach((r) => {
      assert.ok(r.sidebarLabel, `route ${r.path} should have a sidebar label`);
      assert.ok(r.icon, `route ${r.path} should have an icon`);
    });
  });

  it('should have searchable routes with keywords', () => {
    assert.ok(searchableRoutes.length >= 7, 'should have at least 7 searchable routes');
    searchableRoutes.forEach((r) => {
      assert.ok(r.keywords, `route ${r.path} should have keywords`);
    });
  });
});
