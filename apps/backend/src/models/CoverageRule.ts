import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { ServiceType, LimitPeriod } from '@claims/shared/enums';

interface CoverageRuleAttributes {
  id: number;
  policy_id: number;
  service_type: ServiceType;
  is_covered: boolean;
  coverage_percentage: number;
  max_amount: number;
  limit_period: LimitPeriod;
  requires_pre_auth: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type CoverageRuleInput = Optional<CoverageRuleAttributes, 'id'>;
export type CoverageRuleOutput = Required<CoverageRuleAttributes>;

export class CoverageRule extends Model<CoverageRuleAttributes, CoverageRuleInput> implements CoverageRuleAttributes {
  public id!: number;
  public policy_id!: number;
  public service_type!: ServiceType;
  public is_covered!: boolean;
  public coverage_percentage!: number;
  public max_amount!: number;
  public limit_period!: LimitPeriod;
  public requires_pre_auth!: boolean;
  public created_at?: Date;
  public updated_at?: Date;

  static associate(models: Record<string, any>) {
    CoverageRule.belongsTo(models.Policy, { foreignKey: 'policy_id', as: 'policy' });
  }

  static initModel(sequelize: Sequelize) {
    CoverageRule.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        policy_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'policies', key: 'id' } },
        service_type: { type: DataTypes.ENUM(...Object.values(ServiceType)), allowNull: false },
        is_covered: { type: DataTypes.BOOLEAN, defaultValue: true },
        coverage_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100 },
        max_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        limit_period: { type: DataTypes.ENUM(...Object.values(LimitPeriod)), allowNull: false, defaultValue: LimitPeriod.ANNUAL },
        requires_pre_auth: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      {
        sequelize,
        tableName: 'coverage_rules',
        timestamps: true,
        underscored: true,
      },
    );
  }
}
