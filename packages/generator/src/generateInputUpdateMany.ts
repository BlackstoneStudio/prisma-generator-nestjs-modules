import * as path from 'path';
import { Project } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase } from './helpers';

export const generateInputUpdateMany = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const modelName = camelCase(model.name);
  const filePath = path.resolve(
    outputDir,
    `${modelName}/dto/UpdateMany${model.name}.dto.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type'],
  });

  sourceFile.addClass({
    name: `UpdateMany${model.name}Dto`,
    isExported: true,
    properties: [
      {
        name: 'data',
        type: `Update${model.name}Dto`,
        trailingTrivia: '\r\n',
        decorators: [
          {
            name: 'Type',
            arguments: [`() => Update${model.name}Dto`],
          },
          {
            name: 'ApiProperty',
            arguments: [`{ type: Update${model.name}Dto }`],
          },
        ],
      },
      {
        name: 'where',
        type: `Filter${model.name}Dto`,
        trailingTrivia: '\r\n',
        decorators: [
          {
            name: 'Type',
            arguments: [`() => Update${model.name}Dto`],
          },
          {
            name: 'ApiProperty',
            arguments: [`{ type: Update${model.name}Dto }`],
          },
        ],
      },
    ],
  });
};
