import { generatorHandler } from '@prisma/generator-helper';
import { logger } from '@prisma/internals';
import { generate } from './generator';
const { version } = require('../package.json');

generatorHandler({
  onManifest: () => {
    logger.info(`initial manifest`);
    return {
      version,
      defaultOutput: '../generated',
      prettyName: 'prisma-generator-nestjs-modules',
    };
  },
  onGenerate: generate,
});