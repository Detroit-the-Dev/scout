import { Controller, Get, Param } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  
  @Get('/similar/:term')
  getSimilar(@Param('term') term: string) {
    return this.searchService.findSimilar(term);
  }
}
