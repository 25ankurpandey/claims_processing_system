import Joi from 'joi';
import { ServiceType } from '@claims/shared/enums';

export const createMemberSchema = Joi.object({
  first_name: Joi.string().required().min(1).max(100),
  last_name: Joi.string().required().min(1).max(100),
  email: Joi.string().email().required(),
  date_of_birth: Joi.date().required(),
});

export const createPolicySchema = Joi.object({
  member_id: Joi.number().integer().required(),
  effective_date: Joi.date().required(),
  expiration_date: Joi.date().required().greater(Joi.ref('effective_date')),
  annual_deductible: Joi.number().min(0).default(0),
  annual_max_benefit: Joi.number().min(0).default(100000),
  coverage_rules: Joi.array()
    .items(
      Joi.object({
        service_type: Joi.string()
          .valid(...Object.values(ServiceType))
          .required(),
        is_covered: Joi.boolean().default(true),
        coverage_percentage: Joi.number().min(0).max(100).default(80),
        max_amount: Joi.number().min(0).required(),
        limit_period: Joi.string().valid('PER_VISIT', 'ANNUAL', 'LIFETIME').default('ANNUAL'),
        requires_pre_auth: Joi.boolean().default(false),
      }),
    )
    .min(1)
    .required(),
});

export const submitClaimSchema = Joi.object({
  member_id: Joi.number().integer().required(),
  policy_id: Joi.number().integer().required(),
  provider_name: Joi.string().required().min(1).max(200),
  provider_npi: Joi.string().optional().max(20),
  diagnosis_code: Joi.string().required().min(1).max(20),
  date_of_service: Joi.date().required(),
  line_items: Joi.array()
    .items(
      Joi.object({
        service_type: Joi.string()
          .valid(...Object.values(ServiceType))
          .required(),
        description: Joi.string().required().min(1).max(500),
        billed_amount: Joi.number().positive().required(),
      }),
    )
    .min(1)
    .required(),
});

export const transitionStateSchema = Joi.object({
  status: Joi.string()
    .valid('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PAID', 'DISPUTED', 'CLOSED')
    .required(),
});
