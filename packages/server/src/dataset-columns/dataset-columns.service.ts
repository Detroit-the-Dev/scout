import { Injectable } from '@nestjs/common';
import {
  DatasetColumn,
  JoinSuggestion,
  PagedFieldCount,
} from './dataset-column.entity';
import { Portal } from '../portals/portal.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Not, Like } from 'typeorm';

@Injectable()
export class DatasetColumnsService {
  constructor(
    @InjectRepository(DatasetColumn)
    private readonly datasetColumnsRepo: Repository<DatasetColumn>,
  ) {}

  findById(id: number): Promise<DatasetColumn> {
    return this.datasetColumnsRepo.findOne(id);
  }

  findAll(): Promise<DatasetColumn[]> {
    return this.datasetColumnsRepo.find();
  }

  async uniqueCountsForPortal(
    portal: Portal,
    limit?: number,
    offset?: number,
    search?: string,
  ): Promise<PagedFieldCount> {
    let query = this.datasetColumnsRepo.createQueryBuilder('column');

    query = query.where('portalId = :portal', {
      portal: portal.id,
    });

    //TODO make this safer
    if (search) query.andWhere('field like :search', { search: `%${search}%` });

    let countQuery = query.clone();

    const { total } = await countQuery
      .select('COUNT(DISTINCT field) as total')
      .getRawOne();

    query = query
      .select('field')
      .addSelect('COUNT(*)', 'occurrences')
      .groupBy('field')
      .orderBy('occurrences', 'DESC');

    if (limit) query = query.take(limit);
    if (offset) query = query.skip(offset);

    const result = await query.getRawMany();
    console.log('unique query result ', result, total);

    const pagedResult = {
      items: result,
      total,
    };
    return Promise.resolve(pagedResult as PagedFieldCount);
  }

  async countJoinableColumns(
    column: DatasetColumn,
    global: boolean = false,
  ): Promise<number> {
    const portal = await column.portal;

    const query = global
      ? { name: column.name, id: Not(column.id) }
      : {
          name: column.name,
          id: Not(column.id),
          portal: { id: portal.id },
        };

    console.log('Query is ', query, column);
    const result = await this.datasetColumnsRepo.count({
      where: query,
    });

    return Promise.resolve(result);
  }

  async findJoinableColumns(
    column: DatasetColumn,
    global: boolean = false,
    limit?: number,
    offset?: number,
  ): Promise<JoinSuggestion[]> {
    const portal = await column.portal;
    const query = global
      ? { name: column.name, id: Not(column.id) }
      : {
          name: column.name,
          id: Not(column.id),
          portal: { id: portal.id },
        };

    const result = await this.datasetColumnsRepo.find({
      where: query,
      take: limit,
      skip: offset,
    });

    console.log('result is ', result);

    return Promise.resolve(
      result.map(r => ({ column: r, potentialOverlap: 10 })),
    );
  }

  createOrUpdate(datasetColumn: DatasetColumn) {
    return this.datasetColumnsRepo.save(datasetColumn).catch(err => {
      console.log('failed to save ', datasetColumn);
      console.log(err);
    });
  }
}