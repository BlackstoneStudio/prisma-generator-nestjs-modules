import { generatorHandler } from '@prisma/generator-helper';
import { logger } from '@prisma/internals';
import { generate } from './generator';
const { version } = require('../package.json');

generatorHandler({
  onManifest: () => {
    logger.info(`initial manifest`);
    return {
      version,
      defaultOutput: '../../_gen/crud',
      prettyName: 'Generate Custom',
    };
  },
  onGenerate: generate,
});