import { Test, TestingModule } from '@nestjs/testing';
import { ReprocanService } from './reprocan.service';

describe('ReprocanService', () => {
  let service: ReprocanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReprocanService],
    }).compile();

    service = module.get<ReprocanService>(ReprocanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
