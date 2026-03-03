import { Test, TestingModule } from '@nestjs/testing';
import { StrainsService } from './strains.service';

describe('StrainsService', () => {
  let service: StrainsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrainsService],
    }).compile();

    service = module.get<StrainsService>(StrainsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
