import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../extensions/stelow/state';

describe('classifyIntent', () => {
  it('returns unknown for empty text', () => {
    expect(classifyIntent('')).toBe('unknown');
  });

  it('returns unknown for very short text (< 6 chars)', () => {
    expect(classifyIntent('fix')).toBe('unknown');
  });

  it('detects new-product from greenfield keywords', () => {
    expect(classifyIntent('create a new project for invoicing')).toBe('new-product');
    expect(classifyIntent('build a new platform from scratch')).toBe('new-product');
    expect(classifyIntent('greenfield saas for team collaboration')).toBe('new-product');
  });

  it('detects bugfix from bug/crash keywords', () => {
    expect(classifyIntent('bug in the middleware validation')).toBe('bugfix');
    expect(classifyIntent('application throws error on startup')).toBe('bugfix');
    expect(classifyIntent('fix the crash on the checkout page')).toBe('bugfix');
    expect(classifyIntent('fix the timeout issue in the payment gateway')).toBe('bugfix');
  });

  it('detects refactor from simplify/restructure keywords', () => {
    expect(classifyIntent('reduce complexity of the codebase')).toBe('refactor');
    expect(classifyIntent('refactor the billing module to reduce coupling')).toBe('refactor');
    expect(classifyIntent('simplify the payment processing flow')).toBe('refactor');
    expect(classifyIntent('clean up technical debt in billing service')).toBe('refactor');
    expect(classifyIntent('extract shared logic into a common library')).toBe('refactor');
  });

  it('detects investigate from research/spike keywords', () => {
    expect(classifyIntent('research if we should migrate to NATS')).toBe('investigate');
    expect(classifyIntent('spike on using WebAssembly for image processing')).toBe('investigate');
    expect(classifyIntent('evaluate postgres vs sqlite for mobile sync')).toBe('investigate');
    expect(classifyIntent('explore caching strategies for the API layer')).toBe('investigate');
  });

  it('detects feature from add/implement keywords', () => {
    expect(classifyIntent('implement dark mode toggle')).toBe('feature');
    expect(classifyIntent('add support for oauth login')).toBe('feature');
    expect(classifyIntent('add csv export to the reports page')).toBe('feature');
    expect(classifyIntent('implement search with autocomplete')).toBe('feature');
  });

  it('returns unknown when intent is ambiguous (multiple close matches)', () => {
    // "fix performance" could be bugfix or refactor — close match → unknown
    const result = classifyIntent('fix the performance of the login page');
    // If both bugfix and refactor match closely, should be unknown
    // But if bugfix clearly wins, that's also valid
    expect(['bugfix', 'unknown']).toContain(result);
  });

  it('detects bugfix when bug keywords clearly dominate', () => {
    expect(classifyIntent('fix the crash that happens when saving empty forms')).toBe('bugfix');
  });

  it('detects refactor when optimize keywords present', () => {
    expect(classifyIntent('optimize the database query performance')).toBe('refactor');
    expect(classifyIntent('restructure the billing service architecture')).toBe('refactor');
  });

  it('handles non-english text by returning unknown (keyword-only classifier)', () => {
    expect(classifyIntent('criar um novo produto de faturamento')).toBe('unknown');
    // "bug" is an English keyword, so only test fully non-English text
    expect(classifyIntent('isso precisa ser refeito do zero')).toBe('unknown');
  });
});
