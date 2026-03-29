import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface MemberAttributes {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: Date;
  created_at?: Date;
  updated_at?: Date;
}

export type MemberInput = Optional<MemberAttributes, 'id'>;
export type MemberOutput = Required<MemberAttributes>;

export class Member extends Model<MemberAttributes, MemberInput> implements MemberAttributes {
  public id!: number;
  public first_name!: string;
  public last_name!: string;
  public email!: string;
  public date_of_birth!: Date;
  public created_at?: Date;
  public updated_at?: Date;

  static associate(models: Record<string, any>) {
    Member.hasOne(models.Policy, { foreignKey: 'member_id', as: 'policy' });
    Member.hasMany(models.Claim, { foreignKey: 'member_id', as: 'claims' });
  }

  static initModel(sequelize: Sequelize) {
    Member.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        first_name: { type: DataTypes.STRING, allowNull: false },
        last_name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        date_of_birth: { type: DataTypes.DATEONLY, allowNull: false },
      },
      {
        sequelize,
        tableName: 'members',
        timestamps: true,
        underscored: true,
      },
    );
  }
}
