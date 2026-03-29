export class Constants {
  public static API_PREFIX = '/api/v1';
  public static readonly AUTH_SCHEME_BEARER = 'Bearer ';
  public static JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
}
