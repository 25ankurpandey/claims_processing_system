import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface PolicyAttributes {
  id: number;
  policy_number: string;
  member_id: number;
  effective_date: Date;
  expiration_date: Date;
  is_active: boolean;
  annual_deductible: number;
  annual_max_benefit: number;
  created_at?: Date;
  updated_at?: Date;
}

export type PolicyInput = Optional<PolicyAttributes, 'id'>;
export type PolicyOutput = Required<PolicyAttributes>;

export class Policy extends Model<PolicyAttributes, PolicyInput> implements PolicyAttributes {
  public id!: number;
  public policy_number!: string;
  public member_id!: number;
  public effective_date!: Date;
  public expiration_date!: Date;
  public is_active!: boolean;
  public annual_deductible!: number;
  public annual_max_benefit!: number;
  public created_at?: Date;
  public updated_at?: Date;

  static associate(models: Record<string, any>) {
    Policy.belongsTo(models.Member, { foreignKey: 'member_id', as: 'member' });
    Policy.hasMany(models.CoverageRule, { foreignKey: 'policy_id', as: 'coverageRules' });
    Policy.hasMany(models.Claim, { foreignKey: 'policy_id', as: 'claims' });
  }

  static initModel(sequelize: Sequelize) {
    Policy.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        policy_number: { type: DataTypes.STRING, allowNull: false, unique: true },
        member_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'members', key: 'id' } },
        effective_date: { type: DataTypes.DATEONLY, allowNull: false },
        expiration_date: { type: DataTypes.DATEONLY, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        annual_deductible: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        annual_max_benefit: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 100000 },
      },
      {
        sequelize,
        tableName: 'policies',
        timestamps: true,
        underscored: true,
      },
    );
  }
}
