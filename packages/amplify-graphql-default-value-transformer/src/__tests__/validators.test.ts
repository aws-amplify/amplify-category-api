import { TypeValidators } from '../validators';

describe('TypeValidators', () => {
  const { ID, String, Int, Float, AWSDate, AWSDateTime } = new TypeValidators();

  describe('ID', () => {
    it('passes on string-like', () => {
      expect(ID('validString')).toEqual(true);
    });

    it('fails on non string-like', () => {
      expect(ID({ im: 'not a string' } as any)).toEqual(false);
    });
  });

  describe('String', () => {
    it('passes on string-like', () => {
      expect(String('validString')).toEqual(true);
    });

    it('fails on non string-like', () => {
      expect(String({ im: 'not a string' } as any)).toEqual(false);
    });
  });

  describe('Int', () => {
    it('passes on int', () => {
      expect(Int('13')).toEqual(true);
    });

    it('fails on non-int', () => {
      expect(Int('thirteen')).toEqual(false);
    });
  });

  describe('Float', () => {
    it('passes on float', () => {
      expect(Float('13.14')).toEqual(true);
    });

    it('fails on non-float', () => {
      expect(Float('thirteen.fourteen')).toEqual(false);
    });
  });

  describe('AWSDate', () => {
    it('passes on valid date', () => {
      expect(AWSDate('2023-10-10')).toEqual(true);
    });

    it('fails on feb', () => {
      expect(AWSDate('2024-02-10')).toEqual(true);
    });

    it('fails on out of bound date', () => {
      expect(AWSDate('2023-10-32')).toEqual(false);
    });

    it('fails on feb 29 on a non-leap-year', () => {
      expect(AWSDate('2023-02-29')).toEqual(false);
    });

    it('fails on feb 30 on a leap year', () => {
      expect(AWSDate('2024-02-30')).toEqual(false);
    });

    it('fails on nov of bound date', () => {
      expect(AWSDate('2023-11-31')).toEqual(false);
    });
  });

  describe('AWSDateTime', () => {
    it('passes on valid datetime', () => {
      expect(AWSDateTime('2023-10-10T08:13:13.1999Z')).toEqual(true);
    });

    it('fails on valid time', () => {
      expect(AWSDateTime('202-10-10T08:13:13.1999Z')).toEqual(false);
    });
  });
});