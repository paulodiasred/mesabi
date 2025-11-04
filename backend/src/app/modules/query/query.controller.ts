import { Controller, Post, Body, Logger, Req, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QueryService } from './query.service';
import { QueryRequestDto } from './dto/query-request.dto';
import { Request } from 'express';

@ApiTags('Query')
@Controller('query')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(private readonly queryService: QueryService) {}

  @Post('run')
  @ApiOperation({ summary: 'Execute analytics query' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  async runQuery(@Body() request: QueryRequestDto, @Req() req: Request) {
    this.logger.debug(`Request body: ${JSON.stringify(req.body, null, 2)}`);
    return this.queryService.executeQuery(request);
  }

  @Get('product-combinations')
  @ApiOperation({ summary: 'Get product combinations (frequently bought together)' })
  @ApiQuery({ name: 'minOccurrences', required: false, type: Number, description: 'Minimum number of times products appear together' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Product combinations retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getProductCombinations(
    @Query('minOccurrences') minOccurrences?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const minOcc = minOccurrences ? parseInt(minOccurrences, 10) : 1;
    const timeRange = (startDate || endDate) ? { start: startDate, end: endDate } : undefined;
    
    this.logger.debug(`Getting product combinations with minOccurrences=${minOcc}, timeRange=${JSON.stringify(timeRange)}`);
    return this.queryService.getProductCombinations(minOcc, timeRange);
  }
}

