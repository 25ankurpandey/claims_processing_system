/**
 * Dependency injection tokens — used with @provideSingleton() and @inject()
 * Using Symbols prevents the "Cannot access before initialization" error
 * that occurs when using the class constructor directly as an identifier.
 */
export const TYPES = {
  // Repositories
  MemberDal: Symbol.for('MemberDal'),
  PolicyDal: Symbol.for('PolicyDal'),
  ClaimDal: Symbol.for('ClaimDal'),

  // Services
  MemberService: Symbol.for('MemberService'),
  PolicyService: Symbol.for('PolicyService'),
  ClaimService: Symbol.for('ClaimService'),
  AdjudicationService: Symbol.for('AdjudicationService'),
};
