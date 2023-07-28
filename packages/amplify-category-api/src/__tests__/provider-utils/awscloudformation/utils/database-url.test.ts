import { parseDatabaseUrl } from '../../../../provider-utils/awscloudformation/utils/database-url';

describe('parseDatabaseUrl', () => {
  it('should parse a valid database url', () => {
    const databaseUrl = 'mysql://username:password@localhost:3306/database';
    const expected = {
      engine: 'mysql',
      username: 'username',
      password: 'password',
      database: 'database',
      host: 'localhost',
      port: 3306,
    };
    const actual = parseDatabaseUrl(databaseUrl);
    expect(actual).toEqual(expected);
  });

  it('should parse a valid database url without port', () => {
    const databaseUrl = 'mysql://username:password@localhost/database';
    const expected = {
      engine: 'mysql',
      username: 'username',
      password: 'password',
      database: 'database',
      host: 'localhost',
      port: NaN,
    };
    const actual = parseDatabaseUrl(databaseUrl);
    expect(actual).toEqual(expected);
  });

  it('should parse a valid database url without username and password', () => {
    const databaseUrl = 'mysql://localhost:3306/database';
    const expected = {
      engine: 'mysql',
      username: '',
      password: '',
      database: 'database',
      host: 'localhost',
      port: 3306,
    };
    const actual = parseDatabaseUrl(databaseUrl);
    expect(actual).toEqual(expected);
  });

  it('should throw an error for an invalid database url', () => {
    const databaseUrl = 'http://username:password@localhost:3306/database';
    expect(() => parseDatabaseUrl(databaseUrl)).toThrow('Invalid engine http.');
  });

  it('should accept uppercase engine name', () => {
    const databaseUrl = 'MySQL://username:password@localhost:3306/database';
    const expected = {
      engine: 'mysql',
      username: 'username',
      password: 'password',
      database: 'database',
      host: 'localhost',
      port: 3306,
    };
    const actual = parseDatabaseUrl(databaseUrl);
    expect(actual).toEqual(expected);
  });

  it('should return empty object for an invalid database url', () => {
    const databaseUrl = '1234567890';
    const expected = {};
    const actual = parseDatabaseUrl(databaseUrl);
    expect(actual).toEqual(expected);
  });
});
