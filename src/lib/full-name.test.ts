import { describe, expect, it } from 'vitest';
import { isCompleteName, joinFullName, splitFullName } from './full-name';

describe('full name', () => {
  it('splits by the last space (Turkish: several given names, one surname)', () => {
    expect(splitFullName('Ayşe Nur  Yılmaz ')).toEqual({ first: 'Ayşe Nur', last: 'Yılmaz' });
    expect(splitFullName('Konstantin')).toEqual({ first: 'Konstantin', last: '' });
    expect(splitFullName(null)).toEqual({ first: '', last: '' });
  });

  it('joins back into one string and round-trips', () => {
    expect(joinFullName(' Ayşe  Nur', 'Yılmaz ')).toBe('Ayşe Nur Yılmaz');
    expect(joinFullName('Konstantin', '')).toBe('Konstantin');
    const { first, last } = splitFullName('Mehmet Ali Öztürk');
    expect(joinFullName(first, last)).toBe('Mehmet Ali Öztürk');
  });

  it('a name is complete only with both parts', () => {
    expect(isCompleteName('Ayşe', 'Yılmaz')).toBe(true);
    expect(isCompleteName('Ayşe', '  ')).toBe(false);
    expect(isCompleteName('', 'Yılmaz')).toBe(false);
  });
});
