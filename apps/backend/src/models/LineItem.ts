import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { ServiceType, LineItemStatus, DenialReason } from '@claims/shared/enums';

interface LineItemAttributes {
  id: number;
  claim_id: number;
  service_type: ServiceType;
  description: string;
  billed_amount: number;
  approved_amount: number;
  status: LineItemStatus;
  denial_reason?: DenialReason;
  explanation?: string;
  created_at?: Date;
  updated_at?: Date;
}

export type LineItemInput = Optional<LineItemAttributes, 'id' | 'approved_amount' | 'status'>;
export type LineItemOutput = Required<LineItemAttributes>;

export class LineItem extends Model<LineItemAttributes, LineItemInput> implements LineItemAttributes {
  public id!: number;
  public claim_id!: number;
  public service_type!: ServiceType;
  public description!: string;
  public billed_amount!: number;
  public approved_amount!: number;
  public status!: LineItemStatus;
  public denial_reason?: DenialReason;
  public explanation?: string;
  public created_at?: Date;
  public updated_at?: Date;

  static associate(models: Record<string, any>) {
    LineItem.belongsTo(models.Claim, { foreignKey: 'claim_id', as: 'claim' });
  }

  static initModel(sequelize: Sequelize) {
    LineItem.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        claim_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'claims', key: 'id' } },
        service_type: { type: DataTypes.ENUM(...Object.values(ServiceType)), allowNull: false },
        description: { type: DataTypes.STRING, allowNull: false },
        billed_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        approved_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        status: {
          type: DataTypes.ENUM(...Object.values(LineItemStatus)),
          allowNull: false,
          defaultValue: LineItemStatus.PENDING,
        },
        denial_reason: { type: DataTypes.ENUM(...Object.values(DenialReason)), allowNull: true },
        explanation: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        tableName: 'line_items',
        timestamps: true,
        underscored: true,
      },
    );
  }
}
