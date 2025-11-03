import { Controller, Post, Body, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
}

