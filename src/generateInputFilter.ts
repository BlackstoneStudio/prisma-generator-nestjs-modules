import * as path from 'path';
import { OptionalKind, Project, PropertyDeclarationStructure } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { getArgumentsApi, getType, snakeCase, validPassword } from './helpers';

export const generateInputFilter = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const pathName = snakeCase(model.name);
  const properties = model.fields;

  const filePath = path.resolve(
    outputDir,
    `${pathName}/dto/filter-${pathName}.dto.ts`,
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

    if (prop.relationName) {
      return;
    }

    decorators.push({
      name: 'ApiProperty',
      arguments: getArgumentsApi(prop.typeGraphQLType, false),
    });

    decorators.push({
      name: 'Type',
      arguments: getType(prop.typeGraphQLType, prop.location === 'enumTypes'),
    });

    if (prop.name.toLocaleLowerCase().includes('password')) {
      decorators.push({
        name: 'Matches',
        arguments: validPassword(prop.name),
      });
    }

    decorators.push({
      name: 'IsOptional',
      arguments: [],
    });

    namedImportsValidator.push('IsOptional');

    propertyToClass.push({
      name: prop.name,
      type: prop.fieldTSType,
      hasExclamationToken: !!prop.isRequired,
      hasQuestionToken: true,
      trailingTrivia: '\r\n',
      decorators: decorators,
    });
  });

  propertyToClass.push({
    name: 'includeDeleted',
    type: 'boolean',
    trailingTrivia: '\r\n',
    hasQuestionToken: true,
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: Boolean }`],
      },
      {
        name: 'Type',
        arguments: [`() => Boolean`],
      },
      {
        name: 'IsOptional',
        arguments: [],
      },
    ],
  });

  sourceFile.addClass({
    name: `Filter${model.name}Dto`,
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
