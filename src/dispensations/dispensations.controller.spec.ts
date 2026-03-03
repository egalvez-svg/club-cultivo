import { Test, TestingModule } from '@nestjs/testing';
import { DispensationsController } from './dispensations.controller';

describe('DispensationsController', () => {
  let controller: DispensationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DispensationsController],
    }).compile();

    controller = module.get<DispensationsController>(DispensationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
