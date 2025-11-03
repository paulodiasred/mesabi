import { IsString, IsArray, IsOptional, IsEnum, ValidateNested, IsNumber, Min, Max, Allow } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum QuerySubject {
  VENDAS = 'vendas',
  ENTREGAS = 'entregas',
  PRODUTOS = 'produtos',
  CLIENTES = 'clientes',
  ITEMS = 'items',
}

export enum FilterOperator {
  EQ = '=',
  NE = '!=',
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  BETWEEN = 'between',
  IN = 'in',
  LIKE = 'like',
  CONTAINS = 'contains',
}

export enum MeasureAggregation {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  DISTINCT_COUNT = 'distinct_count',
}

export class QueryFilterDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: FilterOperator })
  @IsEnum(FilterOperator)
  op: FilterOperator;

  @ApiProperty()
  @Allow()
  value: any;
}

export class QueryMeasureDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: MeasureAggregation })
  @IsEnum(MeasureAggregation)
  aggregation: MeasureAggregation;

  @ApiProperty()
  @IsString()
  field: string;
}

export class QueryDimensionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  grouping?: string;
}

export class TimeRangeDto {
  @ApiProperty()
  @IsString()
  from: string;

  @ApiProperty()
  @IsString()
  to: string;
}

export class OrderByDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  direction: 'asc' | 'desc';
}

export class QueryRequestDto {
  @ApiProperty({ enum: QuerySubject })
  @IsEnum(QuerySubject)
  subject: QuerySubject;

  @ApiProperty({ type: [QueryMeasureDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryMeasureDto)
  measures?: QueryMeasureDto[];

  @ApiProperty({ type: [QueryDimensionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryDimensionDto)
  dimensions?: QueryDimensionDto[];

  @ApiProperty({ type: [QueryFilterDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryFilterDto)
  filters?: QueryFilterDto[];

  @ApiProperty({ type: TimeRangeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  timeRange?: TimeRangeDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  compareTo?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderByDto)
  orderBy?: OrderByDto;
}
