import * as path from 'path';
import { Project } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { snakeCase } from './helpers';

export const generateModule = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const pathName = snakeCase(model.name);
  const filePath = path.resolve(
    outputDir,
    `${pathName}/${pathName}.module.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(`import { Module } from '@nestjs/common';
    import { ${model.name}Service } from './${pathName}.service';
    import { ${model.name}Controller } from './${pathName}.controller';
    
    @Module({
      providers: [${model.name}Service],
      controllers: [${model.name}Controller],
      exports: [${model.name}Service],
    })
    export class ${model.name}Module {}
  `);
};
