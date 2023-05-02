import * as path from 'path';
import { OptionalKind, Project, PropertyDeclarationStructure } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase, getArgumentsApi, getType, validPassword } from './helpers';

export const generateInputUpdate = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const modelName = camelCase(model.name);
  const properties = model.fields;

  const filePath = path.resolve(
    outputDir,
    `${modelName}/dto/Update${model.name}.dto.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type'],
  });

  const namedImportsValidator = [];
  const propertyToClass: OptionalKind<PropertyDeclarationStructure>[] = [];

  properties.forEach((prop) => {
    const decorators = [];

    if (prop.relationName) {
      return;
    } else {
      decorators.push({
        name: 'ApiProperty',
        arguments: getArgumentsApi(
          prop.typeGraphQLType,
          !prop.isRequired || prop.isList,
        ),
      });

      decorators.push({
        name: 'Type',
        arguments: getType(prop.typeGraphQLType, prop.location === 'enumTypes'),
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
        ? `Update${prop.type}Dto${prop.isList ? '[]' : ''}`
        : prop.fieldTSType,
      hasExclamationToken: !!prop.isRequired,
      hasQuestionToken: !prop.isRequired || prop.isList,
      trailingTrivia: '\r\n',
      decorators: decorators,
    });
  });

  sourceFile.addClass({
    name: `Update${model.name}Dto`,
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
