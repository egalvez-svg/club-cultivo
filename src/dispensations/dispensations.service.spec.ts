import { Test, TestingModule } from '@nestjs/testing';
import { DispensationsService } from './dispensations.service';

describe('DispensationsService', () => {
  let service: DispensationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DispensationsService],
    }).compile();

    service = module.get<DispensationsService>(DispensationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
