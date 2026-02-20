import { describe, it, expect } from 'vitest';

describe('i18n', () => {
  it('exports t as a svelte derived store', async () => {
    const mod = await import('../i18n/index');
    expect(mod.t).toBeDefined();
    expect(typeof mod.t.subscribe).toBe('function');
  });

  it('exports locale store', async () => {
    const { locale } = await import('../i18n/index');
    expect(locale).toBeDefined();
    expect(typeof locale.subscribe).toBe('function');
  });

  it('exports setLocale function', async () => {
    const { setLocale } = await import('../i18n/index');
    expect(typeof setLocale).toBe('function');
  });
});
