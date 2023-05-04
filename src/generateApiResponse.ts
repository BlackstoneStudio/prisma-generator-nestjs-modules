import { Project } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase } from './helpers';
import pluralize from 'pluralize';
import * as path from 'path';

export const generateApiResponse = (
  project: Project,
  outputDir: string,
  models: Array<DMMF.Model>,
) => {
  let success: any[] = [];
  let errors: any[] = [];
  const dirPath = path.resolve(outputDir, 'utils');
  const filePathSuccess = path.resolve(dirPath, `success.dictionary.ts`);
  const filePathErrors = path.resolve(dirPath, `error.dictionary.ts`);
  const sourceFileSuccess = project.createSourceFile(
    filePathSuccess,
    undefined,
    {
      overwrite: true,
    },
  );
  const sourceFileError = project.createSourceFile(filePathErrors, undefined, {
    overwrite: true,
  });

  sourceFileError.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiResponse'],
  });
  sourceFileError.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiResponseMetadata'],
  });
  const importDeclaration = sourceFileError.getImportDeclarations()[0];
  importDeclaration.addNamedImport({
    name: 'ApiResponse',
    alias: 'SwaggerApiResponse',
  });

  models.forEach((model) => {
    const modelName = camelCase(model.name);
    const modelNameUpper = modelName.toLocaleUpperCase();

    success = [
      ...success,
      ...[
        `CREATE_${modelNameUpper}: {
        description: 'Create ${modelName}.',
        status: 200,
        type: ${model.name},
        isArray: false,
      }`,
        `GET_ALL_${pluralize(modelNameUpper)}: {
        description: 'Get all ${pluralize(modelName)}.',
        status: 200,
        type: ${model.name},
        isArray: true,
      }`,
        `FILTER_${pluralize(modelNameUpper)}: {
        description: 'Filter ${pluralize(modelName)}.',
        status: 200,
        type: ${model.name},
        isArray: true,
      }`,
        `GET_${modelNameUpper}_BY_ID: {
        description: 'Get ${modelName} by ID.',
        status: 200,
        type: ${model.name},
        isArray: false,
      }`,
        `UPDATE_${modelNameUpper}: {
        description: 'Update ${modelName}.',
        status: 200,
        type: ${model.name},
        isArray: false,
      }`,
        `UPDATE_MANY_${pluralize(modelNameUpper)}: {
        description: 'Update ${pluralize(modelNameUpper)}.',
        status: 200,
        type: ${model.name},
        isArray: false,
      }`,
        `DELETE_${modelNameUpper}: {
        description: 'DELETE ${modelName}.',
        status: 200,
        type: ${model.name},
        isArray: false,
      }`,
      ],
    ];

    errors = [
      ...errors,
      ...[
        `CREATE_${modelNameUpper}_FAILED: {
        description: 'Create ${modelName}.',
        status: 400,
      }`,
        `GET_ALL_${pluralize(modelNameUpper)}_NOT_FOUND: {
        description: '${pluralize(modelName)} not found.',
        status: 404,
      }`,
        `FILTER_${pluralize(modelNameUpper)}_NOT_FOUND: {
        description: '${pluralize(modelName)} not found.',
        status: 404,
      }`,
        `GET_${modelNameUpper}_BY_ID_NOT_FOUND: {
        description: '${modelName} not found.',
        status: 404,
      }`,
        `UPDATE_${modelNameUpper}_NOT_FOUND: {
        description: 'Update ${modelName} not found.',
        status: 404,
      }`,
        `DELETE_${modelNameUpper}_NOT_FOUND: {
        description: '${modelName} not found.',
        status: 404,
      }`,
      ],
    ];
  });

  sourceFileSuccess.addStatements([
    `import { ApiResponses } from '../../../utils/entities/response.entity';
    ${models.map((model) => `import { ${model.name} } from '../${camelCase(model.name)}/entities/${model.name}.entity';`).join(`\t\n`)}

    const Success = ApiResponses({
      ${success.join(',\t\n')}
    });
    
    export default Success;`,
  ]);

  sourceFileError.addStatements([
    `import { ApiResponses, ValidationError } from '../../../utils/entities/response.entity';

    const Errors = ApiResponses({
      VALIDATION_ERROR: {
        status: 400,
        description: 'Validation error.',
        type: ValidationError,
      },
      UNKNOWN_ERROR: {
        status: 500,
        description: 'Unknown error.',
        type: Response,
      },
      UNAUTHORIZED: {
        status: 401,
        description: 'Unauthorized.',
        type: Response,
      },
      ${errors.join(',\t\n')}
    });
    
    const NotTypeError = (error: ApiResponseMetadata): Omit<ApiResponseMetadata, 'type'> => {
      delete error.type;
      return error;
    };

    function CommonErrosResposes() {
      return applyDecorators(
        SwaggerApiResponse(NotTypeError(Errors.VALIDATION_ERROR)),
        SwaggerApiResponse(NotTypeError(Errors.UNKNOWN_ERROR)),
        SwaggerApiResponse(NotTypeError(Errors.UNAUTHORIZED))
      );
    }

    export { NotTypeError, CommonErrosResposes };
    export default Errors;
    `,
  ]);
};
