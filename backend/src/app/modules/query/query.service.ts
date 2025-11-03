import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRequestDto, QueryMeasureDto, QueryDimensionDto, QueryFilterDto } from './dto/query-request.dto';

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Build SQL query from request
   */
  private buildSQL(request: QueryRequestDto): string {
    const { subject, measures, dimensions, filters, timeRange, orderBy, limit } = request;

    // Base table
    const baseTable = this.getBaseTable(subject);

    // Build SELECT clause
    const selectClause = this.buildSelectClause(measures, dimensions, subject);

    // Build WHERE clause
    const whereClause = this.buildWhereClause(filters, timeRange, subject);

    // Build JOIN clause
    const joinClause = this.buildJoinClause(subject, dimensions, filters);

    // Build GROUP BY clause
    const groupByClause = this.buildGroupByClause(dimensions, subject);

    // Build ORDER BY clause
    const orderByClause = this.buildOrderByClause(orderBy);

    // Build LIMIT clause
    const limitClause = limit ? `LIMIT ${limit}` : '';

    // Combine SQL
    let sql = `${selectClause}\nFROM ${baseTable}`;
    
    if (joinClause) {
      sql += `\n${joinClause}`;
    }
    
    if (whereClause) {
      sql += `\nWHERE ${whereClause}`;
    }
    
    if (groupByClause) {
      sql += `\n${groupByClause}`;
    }
    
    if (orderByClause) {
      sql += `\n${orderByClause}`;
    }
    
    if (limitClause) {
      sql += `\n${limitClause}`;
    }

    return sql;
  }

  private getBaseTable(subject: string): string {
    const tables = {
      vendas: 'sales',
      entregas: 'delivery_sales',
      produtos: 'product_sales',
      clientes: 'customers',
      items: 'item_product_sales',
    };
    return tables[subject] || 'sales';
  }

  private buildSelectClause(measures: QueryMeasureDto[], dimensions: QueryDimensionDto[], subject: string): string {
    const selects: string[] = [];

    // Helper to get prefixed field for measures
    const getMeasureField = (field: string, subj: string): string => {
      if (subj === 'vendas') {
        // Prefix fields that might be ambiguous after JOINs
        if (field === 'created_at') {
          return 'sales.created_at';
        }
        if (field === 'id') {
          return 'sales.id';
        }
        // Prefix financial fields to avoid ambiguity
        if (['total_amount', 'total_amount_items', 'total_discount', 'total_increase', 
             'delivery_fee', 'service_tax_fee', 'value_paid'].includes(field)) {
          return `sales.${field}`;
        }
      } else if (subj === 'items') {
        // Prefix fields for items
        if (field === 'id') {
          return 'item_product_sales.id';
        }
        // For items, we might want to sum price or additional_price
        if (['quantity', 'additional_price', 'price', 'amount'].includes(field)) {
          return `item_product_sales.${field}`;
        }
        // If trying to get total_amount from sales, we need to join through product_sales
        // For now, let's handle common cases
        if (field === 'total_amount') {
          return 's.total_amount';  // From sales table via JOIN
        }
      }
      return field;
    };

    // Add measures
    if (measures && measures.length > 0) {
      measures.forEach((measure) => {
        const aggregation = measure.aggregation.toUpperCase();
        const field = getMeasureField(measure.field, subject);
        selects.push(`${aggregation}(${field}) AS ${measure.name}`);
      });
    } else {
      selects.push('COUNT(*) as count');
    }

    // Add dimensions
    if (dimensions && dimensions.length > 0) {
      dimensions.forEach((dim) => {
        if (dim.grouping) {
          // Apply time grouping if needed
          selects.push(this.applyTimeGrouping(dim.field, dim.grouping));
        } else if (dim.field === 'day_of_week') {
          // EXTRACT day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
          selects.push(`EXTRACT(DOW FROM ${this.getCreatedAtField(subject)}) AS day_of_week`);
        } else if (dim.field === 'hour_of_day') {
          // EXTRACT hour of day: 0-23
          selects.push(`EXTRACT(HOUR FROM ${this.getCreatedAtField(subject)}) AS hour_of_day`);
        } else if ((dim.field === 'city' || dim.field === 'state' || dim.field === 'neighborhood') && subject === 'vendas') {
          // City, state and neighborhood come from delivery_addresses (destination region)
          selects.push(`da.${dim.field}`);
        } else if (dim.field === 'customer_id' && subject === 'vendas') {
          // Prefix customer_id to avoid ambiguity
          selects.push(`sales.customer_id`);
        } else if (dim.field === 'channel_id' && subject === 'vendas') {
          // Prefix channel_id to avoid ambiguity
          selects.push(`sales.channel_id`);
        } else if (dim.field === 'store_id' && subject === 'vendas') {
          // Prefix store_id to avoid ambiguity
          selects.push(`sales.store_id`);
        } else if (dim.field === 'item_id' && subject === 'items') {
          // Prefix item_id for items
          selects.push(`item_product_sales.item_id`);
        } else if (dim.field === 'product_id' && subject === 'items') {
          // Prefix product_id for items (from product_sales)
          selects.push(`ps.product_id`);
        } else {
          selects.push(dim.field);
        }
      });
    }

    // Add names when needed
    if (dimensions && dimensions.length > 0 && subject === 'produtos') {
      // Add product name
      selects.push(`p.name AS product_name`);
    } else if (dimensions && dimensions.length > 0 && subject === 'vendas') {
      // Add store/channel/customer names if grouping by them
      const needsStoreName = dimensions.some(d => d.field === 'store_id');
      const needsChannelName = dimensions.some(d => d.field === 'channel_id');
      const needsCustomerName = dimensions.some(d => d.field === 'customer_id');
      
      if (needsStoreName) {
        selects.push(`st.name AS store_name`);
      }
      if (needsChannelName) {
        selects.push(`ch.description AS channel_name`);
      }
      if (needsCustomerName) {
        selects.push(`c.customer_name AS customer_name`);
      }
    } else if (dimensions && dimensions.length > 0 && subject === 'items') {
      // Add item name if grouping by item_id
      const needsItemName = dimensions.some(d => d.field === 'item_id');
      if (needsItemName) {
        selects.push(`i.name AS item_name`);
      }
      // Add product name if grouping by product_id
      const needsProductName = dimensions.some(d => d.field === 'product_id');
      if (needsProductName) {
        selects.push(`p.name AS product_name`);
      }
    }

    return `SELECT ${selects.join(', ')}`;
  }

  private applyTimeGrouping(field: string, grouping: string): string {
    // PostgreSQL date_trunc for time grouping
    return `DATE_TRUNC('${grouping}', ${field}) AS ${field}_${grouping}`;
  }

  private getCreatedAtField(subject: string): string {
    // Return the appropriate created_at field based on subject
    if (subject === 'produtos') {
      return 's.created_at';
    }
    if (subject === 'vendas') {
      return 'sales.created_at';
    }
    if (subject === 'items') {
      return 's.created_at';  // Items need JOIN with sales to get created_at
    }
    return 'created_at';
  }

  private buildWhereClause(filters: QueryFilterDto[], timeRange: any, subject: string): string {
    const conditions: string[] = [];

    // Add time range filter
    if (timeRange) {
      const timeField = timeRange.field || this.getCreatedAtField(subject);
      conditions.push(`${timeField} >= '${timeRange.from}'`);
      conditions.push(`${timeField} <= '${timeRange.to}'`);
    }

    // Add filters
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        conditions.push(this.buildFilterCondition(filter, subject));
      });
    }

    return conditions.join(' AND ');
  }

  private buildFilterCondition(filter: QueryFilterDto, subject: string): string {
    const { field, op, value } = filter;

    // Handle special date/time fields
    // For produtos and items, use s.created_at (sales join), for vendas use sales.created_at
    const datePrefix = subject === 'produtos' || subject === 'items' ? 's.' : subject === 'vendas' ? 'sales.' : '';
    
    if (field === 'day_of_week') {
      // Use EXTRACT(DOW FROM created_at) where 0=Sunday, 1=Monday, etc.
      // PostgreSQL uses 0-6, we'll convert so 1=Monday, 7=Sunday
      const pgDay = value === 7 ? 0 : Number(value);
      return `EXTRACT(DOW FROM ${datePrefix}created_at) = ${pgDay}`;
    }

    if (field === 'hour_from') {
      return `EXTRACT(HOUR FROM ${datePrefix}created_at) >= ${value}`;
    }

    if (field === 'hour_to') {
      return `EXTRACT(HOUR FROM ${datePrefix}created_at) <= ${value}`;
    }

    // Handle created_at for time range filters
    if (field === 'created_at') {
      // Helper to escape values properly
      const escapeValue = (v: any) => typeof v === 'string' ? `'${v}'` : v;
      
      switch (op) {
        case '=':
        case '!=':
        case '>':
        case '<':
        case '>=':
        case '<=':
          return `${datePrefix}created_at ${op} ${escapeValue(value)}`;
        default:
          return `${datePrefix}created_at ${op} ${escapeValue(value)}`;
      }
    }

    // Helper to escape values properly
    const escapeValue = (v: any) => typeof v === 'string' ? `'${v}'` : v;
    
    // Use s. prefix for channel_id only when coming from product_sales context
    const fieldPrefix = (subject === 'produtos' && field === 'channel_id') ? 's.' : '';
    
    switch (op) {
      case '=':
      case '!=':
      case '>':
      case '<':
      case '>=':
      case '<=':
        return `${fieldPrefix}${field} ${op} ${escapeValue(value)}`;
      
      case 'between':
        return `${fieldPrefix}${field} BETWEEN ${escapeValue(value[0])} AND ${escapeValue(value[1])}`;
      
      case 'in':
        const values = Array.isArray(value) ? value : [value];
        return `${fieldPrefix}${field} IN (${values.map(v => escapeValue(v)).join(', ')})`;
      
      case 'like':
        return `${fieldPrefix}${field} LIKE '%${value}%'`;
      
      case 'contains':
        return `${fieldPrefix}${field} @> ARRAY['${value}']`;
      
      default:
        throw new BadRequestException(`Unsupported operator: ${op}`);
    }
  }

  private buildJoinClause(subject: string, dimensions: QueryDimensionDto[], filters?: QueryFilterDto[]): string {
    const joins: string[] = [];

    if (subject === 'produtos' && dimensions && dimensions.some(d => d.field === 'product_id')) {
      // JOIN products table to get product names
      joins.push('LEFT JOIN products p ON product_sales.product_id = p.id');
    }

    // JOIN sales if filtering by channel_id, day of week, or hour from product_sales
    if (subject === 'produtos' && filters && filters.length > 0) {
      const needsSalesJoin = filters.some(f => 
        f.field === 'channel_id' || f.field === 'day_of_week' || f.field === 'hour_from' || f.field === 'hour_to'
      );
      
      if (needsSalesJoin) {
        joins.push('LEFT JOIN sales s ON product_sales.sale_id = s.id');
      }
    }

    if (subject === 'items') {
      // Items always need JOIN with product_sales to get sale_id, then sales for created_at
      joins.push('LEFT JOIN product_sales ps ON item_product_sales.product_sale_id = ps.id');
      joins.push('LEFT JOIN sales s ON ps.sale_id = s.id');
      
      // JOIN items table to get item names
      if (dimensions && dimensions.some(d => d.field === 'item_id')) {
        joins.push('LEFT JOIN items i ON item_product_sales.item_id = i.id');
      }
      
      // JOIN products table to get product names if grouping by product_id
      if (dimensions && dimensions.some(d => d.field === 'product_id')) {
        joins.push('LEFT JOIN products p ON ps.product_id = p.id');
      }
    }

    if (subject === 'vendas') {
      // JOIN stores if grouping by store_id
      if (dimensions && dimensions.some(d => d.field === 'store_id')) {
        joins.push('LEFT JOIN stores st ON sales.store_id = st.id');
      }
      
      // JOIN delivery_addresses if grouping by city, state or neighborhood
      if (dimensions && dimensions.some(d => d.field === 'city' || d.field === 'state' || d.field === 'neighborhood')) {
        joins.push('LEFT JOIN delivery_addresses da ON sales.id = da.sale_id');
      }
      
      // JOIN channels if grouping by channel_id
      if (dimensions && dimensions.some(d => d.field === 'channel_id')) {
        joins.push('LEFT JOIN channels ch ON sales.channel_id = ch.id');
      }
      
      // JOIN customers if grouping by customer_id
      if (dimensions && dimensions.some(d => d.field === 'customer_id')) {
        joins.push('LEFT JOIN customers c ON sales.customer_id = c.id');
      }
    }

    return joins.join('\n');
  }

  private buildGroupByClause(dimensions: QueryDimensionDto[], subject: string): string {
    if (!dimensions || dimensions.length === 0) {
      return '';
    }

    const groupByFields = dimensions.map(d => {
      if (d.grouping) {
        return `DATE_TRUNC('${d.grouping}', ${d.field})`;
      } else if (d.field === 'day_of_week') {
        return `EXTRACT(DOW FROM ${this.getCreatedAtField(subject)})`;
      } else if (d.field === 'hour_of_day') {
        return `EXTRACT(HOUR FROM ${this.getCreatedAtField(subject)})`;
      } else if ((d.field === 'city' || d.field === 'state' || d.field === 'neighborhood') && subject === 'vendas') {
        return `da.${d.field}`;
      } else if (d.field === 'customer_id' && subject === 'vendas') {
        return `sales.customer_id`;
      } else if (d.field === 'channel_id' && subject === 'vendas') {
        return `sales.channel_id`;  // Prefix to avoid ambiguity
      } else if (d.field === 'store_id' && subject === 'vendas') {
        return `sales.store_id`;  // Prefix to avoid ambiguity
      } else if (d.field === 'item_id' && subject === 'items') {
        return `item_product_sales.item_id`;  // Prefix for items
      } else if (d.field === 'product_id' && subject === 'items') {
        return `ps.product_id`;  // Prefix for items (from product_sales)
      }
      return d.field;
    });

    // Add name fields to GROUP BY
    if (subject === 'produtos' && dimensions.some(d => d.field === 'product_id')) {
      groupByFields.push('p.name');
    }

    if (subject === 'items') {
      if (dimensions.some(d => d.field === 'item_id')) {
        groupByFields.push('i.name');
      }
      if (dimensions.some(d => d.field === 'product_id')) {
        groupByFields.push('p.name');
      }
    }

    if (subject === 'vendas') {
      if (dimensions.some(d => d.field === 'store_id')) {
        groupByFields.push('st.name');
      }
      if (dimensions.some(d => d.field === 'channel_id')) {
        // Group by description to handle duplicate channels with same name but different IDs
        groupByFields.push('ch.description', 'ch.id');
      }
      if (dimensions.some(d => d.field === 'customer_id')) {
        groupByFields.push('c.customer_name');
      }
    }

    return `GROUP BY ${groupByFields.join(', ')}`;
  }

  private buildOrderByClause(orderBy: any): string {
    if (!orderBy) {
      return '';
    }
    return `ORDER BY ${orderBy.field} ${orderBy.direction.toUpperCase()}`;
  }

  /**
   * Execute query
   */
  async executeQuery(request: QueryRequestDto) {
    const startTime = Date.now();
    
    try {
      // Build and execute SQL
      const sql = this.buildSQL(request);
      this.logger.debug(`Executing SQL: ${sql}`);

      const rawResult = await this.prisma.$queryRawUnsafe(sql);
      
      // Convert BigInt to Number to avoid serialization issues
      const processedData = this.processBigInt(rawResult);

      return {
        data: processedData,
        metadata: {
          totalRows: Array.isArray(processedData) ? processedData.length : 0,
          executionTime: Date.now() - startTime,
          cached: false,
          sql,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Convert BigInt and Decimal values to Number for JSON serialization
   */
  private processBigInt(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'bigint') {
      return Number(obj);
    }

    // Handle Prisma Decimal (returned as string from AVG, SUM, etc.)
    if (typeof obj === 'string' && !isNaN(parseFloat(obj))) {
      return parseFloat(obj);
    }

    // Handle Prisma Decimal object (from $queryRawUnsafe)
    if (typeof obj === 'object' && obj !== null) {
      // Check if it's a Prisma Decimal object with 'd' array structure
      if (Array.isArray(obj.d) && typeof obj.e === 'number') {
        // Convert Decimal object to string first
        try {
          return parseFloat(String(obj));
        } catch (e) {
          return 0;
        }
      }
      
      // Handle Date objects or timestamps
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      
      // Handle empty object (might be a Date/Timestamp that couldn't be serialized)
      if (Object.keys(obj).length === 0) {
        return null;
      }
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processBigInt(item));
    }

    if (typeof obj === 'object') {
      const processed: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          processed[key] = this.processBigInt(obj[key]);
        }
      }
      return processed;
    }

    return obj;
  }
}

