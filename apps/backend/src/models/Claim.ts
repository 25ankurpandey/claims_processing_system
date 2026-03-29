import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { ClaimStatus } from '@claims/shared/enums';

interface ClaimAttributes {
  id: number;
  claim_number: string;
  member_id: number;
  policy_id: number;
  provider_name: string;
  provider_npi?: string;
  diagnosis_code: string;
  date_of_service: Date;
  status: ClaimStatus;
  total_amount: number;
  approved_amount: number;
  paid_amount: number;
  submitted_at: Date;
  adjudicated_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export type ClaimInput = Optional<ClaimAttributes, 'id' | 'approved_amount' | 'paid_amount' | 'submitted_at'>;
export type ClaimOutput = Required<ClaimAttributes>;

export class Claim extends Model<ClaimAttributes, ClaimInput> implements ClaimAttributes {
  public id!: number;
  public claim_number!: string;
  public member_id!: number;
  public policy_id!: number;
  public provider_name!: string;
  public provider_npi?: string;
  public diagnosis_code!: string;
  public date_of_service!: Date;
  public status!: ClaimStatus;
  public total_amount!: number;
  public approved_amount!: number;
  public paid_amount!: number;
  public submitted_at!: Date;
  public adjudicated_at?: Date;
  public created_at?: Date;
  public updated_at?: Date;

  // Populated by associations
  public lineItems?: any[];

  static associate(models: Record<string, any>) {
    Claim.belongsTo(models.Member, { foreignKey: 'member_id', as: 'member' });
    Claim.belongsTo(models.Policy, { foreignKey: 'policy_id', as: 'policy' });
    Claim.hasMany(models.LineItem, { foreignKey: 'claim_id', as: 'lineItems' });
  }

  static initModel(sequelize: Sequelize) {
    Claim.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        claim_number: { type: DataTypes.STRING, allowNull: false, unique: true },
        member_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'members', key: 'id' } },
        policy_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'policies', key: 'id' } },
        provider_name: { type: DataTypes.STRING, allowNull: false },
        provider_npi: { type: DataTypes.STRING, allowNull: true },
        diagnosis_code: { type: DataTypes.STRING, allowNull: false },
        date_of_service: { type: DataTypes.DATEONLY, allowNull: false },
        status: {
          type: DataTypes.ENUM(...Object.values(ClaimStatus)),
          allowNull: false,
          defaultValue: ClaimStatus.SUBMITTED,
        },
        total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        approved_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        paid_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        submitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        adjudicated_at: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        tableName: 'claims',
        timestamps: true,
        underscored: true,
      },
    );
  }
}
