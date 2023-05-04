import * as path from 'path';
import { OptionalKind, Project, PropertyDeclarationStructure } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase, getArgumentsApi, getType, validPassword } from './helpers';

export const generateInputCreate = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const modelName = camelCase(model.name);
  const properties = model.fields;

  const filePath = path.resolve(
    outputDir,
    `${modelName}/dto/Create${model.name}.dto.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type'],
  });

  const namedImportsValidator: string[] = [];
  const propertyToClass: OptionalKind<PropertyDeclarationStructure>[] = [];

  properties.forEach((prop) => {
    const decorators = [];

    if (prop.isId || prop.relationName) {
      return;
    }

    if (prop.relationName) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: `../../${camelCase(prop.type)}/dto/Create${
          prop.type
        }.dto`,
        namedImports: [`Create${prop.type}Dto`],
      });

      decorators.push({
        name: 'ApiProperty',
        arguments: getArgumentsApi(
          prop.isList
            ? `Array<Create${prop.type}Dto>`
            : `Create${prop.type}Dto`,
          !prop.isRequired || prop.isList,
        ),
      });

      decorators.push({
        name: 'Type',
        arguments: getType(
          prop.isList
            ? `Array<Create${prop.type}Dto>`
            : `Create${prop.type}Dto`,
          prop.location === 'enumTypes',
        ),
      });

      decorators.push({
        name: 'ValidateNested',
        arguments: [],
      });

      namedImportsValidator.push('ValidateNested');
    } else {
      decorators.push({
        name: 'ApiProperty',
        arguments: getArgumentsApi(
          prop.fieldTSType,
          !prop.isRequired || prop.isList,
        ),
      });

      decorators.push({
        name: 'Type',
        arguments: getType(prop.fieldTSType, prop.location === 'enumTypes'),
      });
    }

    if (prop.name.toLocaleLowerCase().includes('password')) {
      decorators.push({
        name: 'Matches',
        arguments: validPassword(prop.name),
      });
    }

    if (!prop.isRequired || prop.isList) {
      decorators.push({
        name: 'IsOptional',
        arguments: [],
      });

      namedImportsValidator.push('IsOptional');
    }

    if (prop.fieldTSType === 'string' && prop.isRequired) {
      decorators.push({
        name: 'IsNotEmpty',
        arguments: [],
      });

      namedImportsValidator.push('IsNotEmpty');
    }

    propertyToClass.push({
      name: prop.name,
      type: prop.relationName
        ? `Create${prop.type}Dto${prop.isList ? '[]' : ''}`
        : prop.fieldTSType,
      hasExclamationToken: !!prop.isRequired,
      hasQuestionToken: !prop.isRequired || prop.isList,
      trailingTrivia: '\r\n',
      decorators: decorators,
    });
  });

  sourceFile.addClass({
    name: `Create${model.name}Dto`,
    isExported: true,
    properties: propertyToClass,
  });

  if (namedImportsValidator.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'class-validator',
      namedImports: namedImportsValidator,
    });
  }
};
