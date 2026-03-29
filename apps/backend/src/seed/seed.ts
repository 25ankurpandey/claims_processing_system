import { Member } from '../models/Member';
import { Policy } from '../models/Policy';
import { CoverageRule } from '../models/CoverageRule';
import { ServiceType, LimitPeriod } from '@claims/shared/enums';
import { Logger } from '../utils/logging/Logger';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase(): Promise<void> {
  Logger.info('Seeding database with demo data...');

  // Create members
  const member1 = await Member.create({
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice.johnson@example.com',
    date_of_birth: new Date('1985-03-15'),
  });

  const member2 = await Member.create({
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob.smith@example.com',
    date_of_birth: new Date('1990-07-22'),
  });

  Logger.info(`Created members: ${member1.id}, ${member2.id}`);

  // Create policies
  const policy1 = await Policy.create({
    policy_number: `POL-${uuidv4().slice(0, 8).toUpperCase()}`,
    member_id: member1.id,
    effective_date: new Date('2026-01-01'),
    expiration_date: new Date('2026-12-31'),
    is_active: true,
    annual_deductible: 500,
    annual_max_benefit: 50000,
  });

  const policy2 = await Policy.create({
    policy_number: `POL-${uuidv4().slice(0, 8).toUpperCase()}`,
    member_id: member2.id,
    effective_date: new Date('2026-01-01'),
    expiration_date: new Date('2026-12-31'),
    is_active: true,
    annual_deductible: 250,
    annual_max_benefit: 100000,
  });

  Logger.info(`Created policies: ${policy1.id}, ${policy2.id}`);

  // Coverage rules for policy 1 (standard plan)
  await CoverageRule.bulkCreate([
    {
      policy_id: policy1.id,
      service_type: ServiceType.CONSULTATION,
      is_covered: true,
      coverage_percentage: 80,
      max_amount: 200,
      limit_period: LimitPeriod.PER_VISIT,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.DIAGNOSTIC,
      is_covered: true,
      coverage_percentage: 90,
      max_amount: 5000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.PROCEDURE,
      is_covered: true,
      coverage_percentage: 70,
      max_amount: 15000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: true,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.PRESCRIPTION,
      is_covered: true,
      coverage_percentage: 85,
      max_amount: 2000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.EMERGENCY,
      is_covered: true,
      coverage_percentage: 100,
      max_amount: 25000,
      limit_period: LimitPeriod.PER_VISIT,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.PREVENTIVE,
      is_covered: true,
      coverage_percentage: 100,
      max_amount: 1000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.MENTAL_HEALTH,
      is_covered: true,
      coverage_percentage: 75,
      max_amount: 3000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.DENTAL,
      is_covered: false,
      coverage_percentage: 0,
      max_amount: 0,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy1.id,
      service_type: ServiceType.VISION,
      is_covered: true,
      coverage_percentage: 60,
      max_amount: 500,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
  ]);

  // Coverage rules for policy 2 (premium plan)
  await CoverageRule.bulkCreate([
    {
      policy_id: policy2.id,
      service_type: ServiceType.CONSULTATION,
      is_covered: true,
      coverage_percentage: 90,
      max_amount: 500,
      limit_period: LimitPeriod.PER_VISIT,
      requires_pre_auth: false,
    },
    {
      policy_id: policy2.id,
      service_type: ServiceType.DIAGNOSTIC,
      is_covered: true,
      coverage_percentage: 95,
      max_amount: 10000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy2.id,
      service_type: ServiceType.PROCEDURE,
      is_covered: true,
      coverage_percentage: 85,
      max_amount: 30000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: true,
    },
    {
      policy_id: policy2.id,
      service_type: ServiceType.PRESCRIPTION,
      is_covered: true,
      coverage_percentage: 90,
      max_amount: 5000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy2.id,
      service_type: ServiceType.EMERGENCY,
      is_covered: true,
      coverage_percentage: 100,
      max_amount: 50000,
      limit_period: LimitPeriod.PER_VISIT,
      requires_pre_auth: false,
    },
    {
      policy_id: policy2.id,
      service_type: ServiceType.DENTAL,
      is_covered: true,
      coverage_percentage: 70,
      max_amount: 2000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
    {
      policy_id: policy2.id,
      service_type: ServiceType.VISION,
      is_covered: true,
      coverage_percentage: 80,
      max_amount: 1000,
      limit_period: LimitPeriod.ANNUAL,
      requires_pre_auth: false,
    },
  ]);

  Logger.info('Coverage rules created for both policies');
  Logger.info('Database seeded successfully!');
  Logger.info(`Member 1 (Alice): id=${member1.id}, policy_id=${policy1.id} (Standard Plan)`);
  Logger.info(`Member 2 (Bob):   id=${member2.id}, policy_id=${policy2.id} (Premium Plan)`);
}
