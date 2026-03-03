import { Test, TestingModule } from '@nestjs/testing';
import { ReprocanController } from './reprocan.controller';

describe('ReprocanController', () => {
  let controller: ReprocanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReprocanController],
    }).compile();

    controller = module.get<ReprocanController>(ReprocanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
