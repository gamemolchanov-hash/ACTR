import { describe, it, expect } from 'vitest';

import { telHref } from './contact-phone';

describe('contact phone links', () => {
  it('builds a tel: link from the digits of the typed phone', () => {
    expect(telHref('+90 531 871 30 07')).toBe('tel:+905318713007');
  });

  it('ignores punctuation Portal users type', () => {
    expect(telHref('+90 (531) 871-30-07')).toBe('tel:+905318713007');
  });

  it.each([null, undefined, '', '   ', '+90'])('gives no link for %j', (phone) => {
    expect(telHref(phone)).toBeNull();
  });
});
