import { Test, TestingModule } from '@nestjs/testing';
import { StrainsController } from './strains.controller';

describe('StrainsController', () => {
  let controller: StrainsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrainsController],
    }).compile();

    controller = module.get<StrainsController>(StrainsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
