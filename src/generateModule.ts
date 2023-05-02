import * as path from 'path';
import { Project } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase } from './helpers';

export const generateModule = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const modelName = camelCase(model.name);
  const filePath = path.resolve(
    outputDir,
    `${modelName}/${modelName}.module.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(`import { Module } from '@nestjs/common'
    import { ${model.name}Service } from './${modelName}.service'
    import { ${model.name}Controller } from './${modelName}.controller'
    
    @Module({
      providers: [${model.name}Service],
      controllers: [${model.name}Controller],
      exports: [${model.name}Service],
    })
    export class ${model.name}Module {}
  `);
};
