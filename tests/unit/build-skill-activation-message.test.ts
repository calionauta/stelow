import { describe, it, expect } from 'vitest';
import { buildSkillActivationMessage } from '../../extensions/stelow/start-message';

describe('buildSkillActivationMessage', () => {
  it('emits the skill activation header with workflow label', () => {
    const msg = buildSkillActivationMessage('my-workflow', '', '');
    expect(msg).toContain('/skill:stelow-product-orchestrator');
    expect(msg).toContain(">>> WORKFLOW STARTED: 'my-workflow' <<<");
    expect(msg).toContain('Current stage: Setup');
    expect(msg).toContain('Auto-advance mode: ON');
  });

  it('emits USER BRIEF section when draftText present', () => {
    const msg = buildSkillActivationMessage('wf', 'parágrafo detalhado de 200 chars com contexto completo do que quero construir...', '');
    expect(msg).toContain('=== USER BRIEF ===');
    expect(msg).toContain('parágrafo detalhado de 200 chars');
  });

  it('emits SOURCE FILES section when allSrc present', () => {
    const msg = buildSkillActivationMessage('wf', '', '\n\n=== FILE: brief.md ===\nconteudo do arquivo\n');
    expect(msg).toContain('=== SOURCE FILES ===');
    expect(msg).toContain('=== FILE: brief.md ===');
    expect(msg).toContain('conteudo do arquivo');
  });

  it('emits both sections when both present', () => {
    const msg = buildSkillActivationMessage('wf', 'inline text', '\n\n=== FILE: a.md ===\nfile content\n');
    expect(msg).toContain('=== USER BRIEF ===');
    expect(msg).toContain('inline text');
    expect(msg).toContain('=== SOURCE FILES ===');
    expect(msg).toContain('file content');
  });

  it('omits both sections when both empty (preserves original behavior)', () => {
    const msg = buildSkillActivationMessage('wf', '', '');
    expect(msg).not.toContain('=== USER BRIEF ===');
    expect(msg).not.toContain('=== SOURCE FILES ===');
  });

  it('passes through large inline text without truncation (10KB brief)', () => {
    const big = 'x'.repeat(10000);
    const msg = buildSkillActivationMessage('wf', big, '');
    expect(msg).toContain(big);
    // No ellipsis truncation marker
    expect(msg).not.toContain('...');
  });

  it('handles unicode and multiline draft text', () => {
    const draft = 'Linha 1\nLinha 2 com acentos: ção, não, então\nLinha 3';
    const msg = buildSkillActivationMessage('wf', draft, '');
    expect(msg).toContain('Linha 1');
    expect(msg).toContain('ção, não, então');
    expect(msg).toContain('Linha 3');
  });

  it('preserves order: header → brief → files', () => {
    const msg = buildSkillActivationMessage('wf', 'brief-content', '\n\n=== FILE: a.md ===\nfile-content\n');
    const headerIdx = msg.indexOf('>>> WORKFLOW STARTED');
    const briefIdx = msg.indexOf('=== USER BRIEF ===');
    const filesIdx = msg.indexOf('=== SOURCE FILES ===');
    expect(headerIdx).toBeLessThan(briefIdx);
    expect(briefIdx).toBeLessThan(filesIdx);
  });
});
