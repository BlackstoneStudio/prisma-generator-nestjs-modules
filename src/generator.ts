import { generatorHandler } from '@prisma/generator-helper';
import { logger } from '@prisma/internals';
import { GENERATOR_NAME } from './constants';
import { generate } from './generate';

const { version } = require('../package.json');

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`)
    return {
      version,
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: generate,
})
