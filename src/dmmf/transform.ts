import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import { DMMF } from './types';
import { parseDocumentationAttributes } from './helpers';
import {
  getInputTypeName,
  camelCase,
  getModelNameFromInputType,
  getTypeGraphQLType,
  getFieldTSType,
  pascalCase,
  cleanDocsString,
  getModelNameFromOutputType,
} from '../helpers';
import { DmmfDocument } from './dmmfDocument';
import pluralize from 'pluralize';
import { GeneratorOptions } from '../options';
import {
  supportedQueryActions,
  supportedMutationActions,
  InputOmitSetting,
} from '../config';

export function transformSchema(
  datamodel: PrismaDMMF.Schema,
  dmmfDocument: DmmfDocument,
): Omit<DMMF.Schema, 'enums'> {
  const inputObjectTypes = [
    ...(datamodel.inputObjectTypes.prisma ?? []),
    ...(datamodel.inputObjectTypes.model ?? []),
  ];
  const outputObjectTypes = [
    ...(datamodel.outputObjectTypes.prisma ?? []),
    ...(datamodel.outputObjectTypes.model ?? []),
  ];

  return {
    inputTypes: inputObjectTypes
      .filter(uncheckedScalarInputsFilter(dmmfDocument))
      .map(transformInputType(dmmfDocument)),
    outputTypes: outputObjectTypes.map(transformOutputType(dmmfDocument)),
    rootMutationType: datamodel.rootMutationType,
    rootQueryType: datamodel.rootQueryType,
  };
}

export function transformMappings(
  mapping: PrismaDMMF.ModelMapping[],
  dmmfDocument: DmmfDocument,
  options: GeneratorOptions,
): DMMF.ModelMapping[] {
  return mapping.map(transformMapping(dmmfDocument, options));
}

export function transformBareModel(model: PrismaDMMF.Model): DMMF.Model {
  const attributeArgs = parseDocumentationAttributes<{ name: string }>(
    model.documentation,
    'type',
    'model',
  );
  return {
    ...model,
    typeName: attributeArgs.name ?? pascalCase(model.name),
    fields: [],
    docs: cleanDocsString(model.documentation),
  };
}

export function transformModelWithFields(dmmfDocument: DmmfDocument) {
  return (model: PrismaDMMF.Model): DMMF.Model => {
    return {
      ...transformBareModel(model),
      fields: model.fields.map(transformModelField(dmmfDocument)),
    };
  };
}

function transformModelField(dmmfDocument: DmmfDocument) {
  return (field: PrismaDMMF.Field): DMMF.ModelField => {
    const attributeArgs = parseDocumentationAttributes<{ name: string }>(
      field.documentation,
      'field',
      'field',
    );
    const location =
      field.kind === 'enum'
        ? 'enumTypes'
        : field.kind === 'object'
        ? 'outputObjectTypes'
        : 'scalar';
    if (typeof field.type !== 'string') {
      throw new Error(
        `[Internal Generator Error] Unexpected 'field.type' value: "${field.type}""`,
      );
    }
    const typeInfo: DMMF.TypeInfo = {
      location,
      isList: field.isList,
      type: dmmfDocument.isModelName(field.type)
        ? dmmfDocument.getModelTypeName(field.type)!
        : field.type,
    };
    const fieldTSType = getFieldTSType(
      dmmfDocument,
      typeInfo,
      field.isRequired,
      false,
    );
    const typeGraphQLType = getTypeGraphQLType(
      typeInfo,
      dmmfDocument,
      undefined,
      undefined,
    );
    const { output = false, input = false } = parseDocumentationAttributes<{
      output: boolean;
      input: boolean | InputOmitSetting[];
    }>(field.documentation, 'omit', 'field');
    return {
      ...field,
      type: field.type,
      location,
      typeFieldAlias: attributeArgs.name,
      fieldTSType,
      typeGraphQLType,
      docs: cleanDocsString(field.documentation),
      isOmitted: { output, input },
    };
  };
}

function uncheckedScalarInputsFilter(dmmfDocument: DmmfDocument) {
  const { useUncheckedScalarInputs } = dmmfDocument.options;
  return (inputType: PrismaDMMF.InputType): boolean => {
    return useUncheckedScalarInputs
      ? true
      : !inputType.name.includes('Unchecked');
  };
}

function transformInputType(dmmfDocument: DmmfDocument) {
  return (inputType: PrismaDMMF.InputType): DMMF.InputType => {
    const modelName = getModelNameFromInputType(inputType.name);
    const modelType = modelName
      ? dmmfDocument.datamodel.models.find((it) => it.name === modelName)
      : undefined;

    return {
      ...inputType,
      typeName: getInputTypeName(inputType.name, dmmfDocument),
      fields: inputType.fields
        .filter((field: PrismaDMMF.SchemaArg) => field.deprecation === undefined)
        .map<DMMF.SchemaArg>((field: PrismaDMMF.SchemaArg) => {
          const modelField = modelType?.fields.find(
            (it) => it.name === field.name,
          );
          const typeName = modelField?.typeFieldAlias ?? field.name;
          const selectedInputType = selectInputTypeFromTypes(dmmfDocument)(
            field.inputTypes,
          );
          const typeGraphQLType = getTypeGraphQLType(
            selectedInputType,
            dmmfDocument,
          );
          const fieldTSType = getFieldTSType(
            dmmfDocument,
            selectedInputType,
            field.isRequired,
            true,
          );
          const isOmitted = !modelField?.isOmitted.input
            ? false
            : typeof modelField.isOmitted.input === 'boolean'
            ? modelField.isOmitted.input
            : (modelField.isOmitted.input.includes(InputOmitSetting.Create) &&
                inputType.name.includes('Create')) ||
              (modelField.isOmitted.input.includes(InputOmitSetting.Update) &&
                inputType.name.includes('Update')) ||
              (modelField.isOmitted.input.includes(InputOmitSetting.Where) &&
                inputType.name.includes('Where')) ||
              (modelField.isOmitted.input.includes(InputOmitSetting.OrderBy) &&
                inputType.name.includes('OrderBy'));
          return {
            ...field,
            selectedInputType,
            typeName,
            typeGraphQLType,
            fieldTSType,
            hasMappedName: field.name !== typeName,
            isOmitted,
          };
        }),
      modelName,
      modelType,
    };
  };
}

function transformOutputType(dmmfDocument: DmmfDocument) {
  return (outputType: PrismaDMMF.OutputType): DMMF.OutputType => {
    const modelName = dmmfDocument.datamodel.models.find(
      (it) => it.name === getModelNameFromOutputType(outputType.name),
    )
      ? getModelNameFromOutputType(outputType.name)
      : undefined;
    const typeName = getMappedOutputTypeName(dmmfDocument, outputType.name);

    return {
      ...outputType,
      typeName,
      fields: outputType.fields
        .filter((field: PrismaDMMF.SchemaField) => field.deprecation === undefined)
        .map<DMMF.OutputSchemaField>((field: PrismaDMMF.SchemaField) => {
          const isFieldRequired =
            field.isNullable !== true && field.name !== '_count';
          const outputTypeInfo: DMMF.TypeInfo = {
            ...field.outputType,
            type: getMappedOutputTypeName(
              dmmfDocument,
              field.outputType.type as string,
            ),
          };
          const fieldTSType = getFieldTSType(
            dmmfDocument,
            outputTypeInfo,
            isFieldRequired,
            false,
          );
          const typeGraphQLType = getTypeGraphQLType(
            outputTypeInfo,
            dmmfDocument,
          );
          const args = field.args.map<DMMF.SchemaArg>((arg: PrismaDMMF.SchemaArg) => {
            const selectedInputType = selectInputTypeFromTypes(dmmfDocument)(
              arg.inputTypes,
            );
            const typeGraphQLType = getTypeGraphQLType(
              selectedInputType,
              dmmfDocument,
            );
            const fieldTSType = getFieldTSType(
              dmmfDocument,
              selectedInputType,
              arg.isRequired,
              true,
            );

            return {
              ...arg,
              selectedInputType,
              fieldTSType,
              typeGraphQLType,
              hasMappedName: arg.name !== typeName,
              typeName: arg.name,
              isOmitted: false,
            };
          });
          const argsTypeName =
            args.length > 0
              ? `${typeName}${pascalCase(field.name)}Args`
              : undefined;

          return {
            ...field,
            isRequired: isFieldRequired,
            outputType: outputTypeInfo,
            fieldTSType,
            typeGraphQLType,
            args,
            argsTypeName,
          };
        }),
      modelName,
    };
  };
}

export function getMappedOutputTypeName(
  dmmfDocument: DmmfDocument,
  outputTypeName: string,
): string {
  if (outputTypeName.startsWith('Aggregate')) {
    const modelTypeName = dmmfDocument.getModelTypeName(
      outputTypeName.replace('Aggregate', ''),
    );
    return `Aggregate${modelTypeName}`;
  }

  if (dmmfDocument.isModelName(outputTypeName)) {
    return dmmfDocument.getModelTypeName(outputTypeName)!;
  }

  const dedicatedTypeSuffix = [
    'CountAggregateOutputType',
    'MinAggregateOutputType',
    'MaxAggregateOutputType',
    'AvgAggregateOutputType',
    'SumAggregateOutputType',
    'GroupByOutputType',
    'CountOutputType',
  ].find((type) => outputTypeName.includes(type));
  if (dedicatedTypeSuffix) {
    const modelName = outputTypeName.replace(dedicatedTypeSuffix, '');
    const operationName = outputTypeName
      .replace(modelName, '')
      .replace('OutputType', '');
    return `${dmmfDocument.getModelTypeName(modelName)}${operationName}`;
  }

  return outputTypeName;
}

function transformMapping(
  dmmfDocument: DmmfDocument,
  options: GeneratorOptions,
) {
  return (mapping: PrismaDMMF.ModelMapping): DMMF.ModelMapping => {
    const { model, plural, ...availableActions } = mapping;
    const modelTypeName = dmmfDocument.getModelTypeName(model) ?? model;
    const actions = Object.entries(availableActions)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(
        ([actionKind, fieldName]) =>
          fieldName && getOperationKindName(actionKind),
      )
      .map<DMMF.Action>((action: [string, string | null]) => {
        const modelAction = action[0];
        const fieldName = action[1] ?? '';
        const kind = modelAction as DMMF.ModelAction;
        const actionOutputType = dmmfDocument.schema.outputTypes.find((type) =>
          type.fields.some((field) => field.name === fieldName),
        );
        if (!actionOutputType) {
          throw new Error(
            `Cannot find type with field ${fieldName} in root types definitions!`,
          );
        }
        const method = actionOutputType.fields.find(
          (field) => field.name === fieldName,
        )!;
        const argsTypeName =
          method.args.length > 0
            ? `${pascalCase(
                `${kind}${dmmfDocument.getModelTypeName(mapping.model)}`,
              )}Args`
            : undefined;
        const outputTypeName = method.outputType.type as string;
        const actionResolverName = `${pascalCase(
          kind,
        )}${modelTypeName}Resolver`;
        const returnTSType = getFieldTSType(
          dmmfDocument,
          method.outputType,
          method.isRequired,
          false,
          mapping.model,
          modelTypeName,
        );
        const typeGraphQLType = getTypeGraphQLType(
          method.outputType,
          dmmfDocument,
          mapping.model,
          modelTypeName,
        );

        return {
          name: getMappedActionName(kind, modelTypeName, options),
          fieldName,
          kind: kind,
          operation: getOperationKindName(kind)!,
          prismaMethod: getPrismaMethodName(kind),
          method,
          argsTypeName,
          outputTypeName,
          actionResolverName,
          returnTSType,
          typeGraphQLType,
        };
      });
    const resolverName = `${modelTypeName}CrudResolver`;
    return {
      model,
      modelTypeName,
      actions,
      collectionName: camelCase(mapping.model),
      resolverName,
    };
  };
}

function selectInputTypeFromTypes(dmmfDocument: DmmfDocument) {
  return (
    inputTypes: PrismaDMMF.SchemaArgInputType[],
  ): DMMF.SchemaArgInputType => {
    const { useUncheckedScalarInputs } = dmmfDocument.options;
    let possibleInputTypes: PrismaDMMF.SchemaArgInputType[];
    possibleInputTypes = inputTypes.filter(
      (it) => it.location === 'inputObjectTypes',
    );
    if (possibleInputTypes.length === 0) {
      possibleInputTypes = inputTypes.filter(
        (it) => it.location === 'scalar' && it.type !== 'Null',
      );
    }
    if (possibleInputTypes.length === 0) {
      possibleInputTypes = inputTypes.filter(
        (it) => it.location === 'enumTypes',
      );
    }
    if (possibleInputTypes.length === 0) {
      possibleInputTypes = inputTypes;
    }
    const selectedInputType =
      possibleInputTypes.find((it) => it.isList) ||
      (useUncheckedScalarInputs &&
        possibleInputTypes.find((it) =>
          (it.type as string).includes('Unchecked'),
        )) ||
      possibleInputTypes[0];

    let inputType = selectedInputType.type as string;
    if (selectedInputType.location === 'enumTypes') {
      const enumDef = dmmfDocument.enums.find((it) => it.name === inputType)!;
      inputType = enumDef.typeName;
    } else if (selectedInputType.location === 'inputObjectTypes') {
      inputType = getInputTypeName(inputType, dmmfDocument);
    }

    return {
      ...selectedInputType,
      type: inputType,
    } as DMMF.SchemaArgInputType;
  };
}

function getMappedActionName(
  actionName: DMMF.ModelAction,
  typeName: string,
  options: GeneratorOptions,
): string {
  const defaultMappedActionName = `${actionName}${typeName}`;
  if (options.useOriginalMapping) {
    return defaultMappedActionName;
  }

  const hasNoPlural = typeName === pluralize(typeName);
  if (hasNoPlural) {
    return defaultMappedActionName;
  }

  switch (actionName) {
    case 'findUnique': {
      return camelCase(typeName);
    }
    case 'findMany': {
      return pluralize(camelCase(typeName));
    }
    default: {
      return defaultMappedActionName;
    }
  }
}

function getOperationKindName(actionName: string) {
  if ((supportedQueryActions as string[]).includes(actionName)) {
    return 'Query';
  }
  if ((supportedMutationActions as string[]).includes(actionName)) {
    return 'Mutation';
  }
  // throw new Error(`Unsupported operation kind: '${actionName}'`);
}

function getPrismaMethodName(actionKind: DMMF.ModelAction) {
  switch (actionKind) {
    case DMMF.ModelAction.createOne:
      return 'create';
    case DMMF.ModelAction.updateOne:
      return 'update';
    case DMMF.ModelAction.upsertOne:
      return 'upsert';
    case DMMF.ModelAction.deleteOne:
      return 'delete';
    default:
      return actionKind;
  }
}

const ENUM_SUFFIXES = ['OrderByRelevanceFieldEnum', 'ScalarFieldEnum'] as const;
export function transformEnums(dmmfDocument: DmmfDocument) {
  return (
    enumDef: PrismaDMMF.DatamodelEnum | PrismaDMMF.SchemaEnum,
  ): DMMF.Enum => {
    let modelName: string | undefined = undefined;
    let typeName = enumDef.name;
    const detectedSuffix = ENUM_SUFFIXES.find((suffix) =>
      enumDef.name.endsWith(suffix),
    );
    if (detectedSuffix) {
      modelName = enumDef.name.replace(detectedSuffix, '');
      typeName = `${dmmfDocument.getModelTypeName(modelName!)}${detectedSuffix}`;
    }
    const enumValues = enumDef.values as Array<
      | PrismaDMMF.DatamodelEnum['values'][number]
      | PrismaDMMF.SchemaEnum['values'][number]
    >;

    return {
      ...enumDef,
      docs:
        'documentation' in enumDef
          ? cleanDocsString(enumDef.documentation)
          : undefined,
      typeName,
      valuesMap: enumValues.map((enumValue) => {
        const enumValueName =
          typeof enumValue === 'string' ? enumValue : enumValue.name;
        return {
          value: enumValueName,
          name:
            (modelName &&
              dmmfDocument.getModelFieldAlias(modelName, enumValueName)) ||
            enumValueName,
        };
      }),
    };
  };
}

export function generateRelationModel(dmmfDocument: DmmfDocument) {
  return (model: DMMF.Model): DMMF.RelationModel => {
    const outputType = dmmfDocument.schema.outputTypes.find(
      (type) => type.name === model.name,
    )!;
    const resolverName = `${model.typeName}RelationsResolver`;
    const relationFields = model.fields
      .filter(
        (field) =>
          field.relationName &&
          !field.isOmitted.output &&
          outputType.fields.some((it) => it.name === field.name),
      )
      .map<DMMF.RelationField>((field) => {
        const outputTypeField = outputType.fields.find(
          (it) => it.name === field.name,
        )!;
        const argsTypeName =
          outputTypeField.args.length > 0
            ? `${model.typeName}${pascalCase(field.name)}Args`
            : undefined;

        return {
          ...field,
          outputTypeField,
          argsTypeName,
          type: dmmfDocument.getModelTypeName(field.type)!,
        };
      });

    return {
      model,
      outputType,
      relationFields,
      resolverName,
    };
  };
}
