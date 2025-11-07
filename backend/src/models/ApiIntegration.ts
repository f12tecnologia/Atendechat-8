import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  Default,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";

@Table
class ApiIntegration extends Model<ApiIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  type: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  baseUrl: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  apiKey: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  instanceName: string;

  @Default(true)
  @Column
  isActive: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  webhookUrl: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  config: object;

  @AllowNull(true)
  @Column(DataType.JSON)
  credentials: object;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;
}

export default ApiIntegration;
