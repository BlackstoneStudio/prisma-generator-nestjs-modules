import { GeneratorOptions } from '@prisma/generator-helper';
import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import * as fs from 'fs';
import { DmmfDocument } from './dmmf/dmmfDocument';
import { ModuleKind, Project, ScriptTarget } from 'ts-morph';
import {
  camelCase,
  parseStringArray,
  parseStringBoolean,
  toUnixPath,
} from './helpers';
import { ALL_EMIT_BLOCK_KINDS, getBlocksToEmit } from './options';
import * as path from 'path';
import { generateInputCreate } from './generateInputCreate';
import { generateOutput } from './generateOutput';
import { generateController } from './generateController';
import { generateService } from './generateService';
import { generateModule } from './generateModule';
import { generateInputUpdate } from './generateInputUpdate';
import { generateInputFilter } from './generateInputFilter';
import { generateApiResponse } from './generateApiResponse';
import { generateInputUpdateMany } from './generateInputUpdateMany';

export async function generate(options: GeneratorOptions) {
  const outputDir = parseEnvValue(options.generator.output!);

  if (!outputDir) {
    throw new Error('No output was specified for generator');
  }

  const generatorConfig = options.generator.config;
  const prismaClientProvider = options.otherGenerators.find(
    (provider) => parseEnvValue(provider.provider) === 'prisma-client-js',
  )!;
  const prismaClientPath = parseEnvValue(prismaClientProvider.output!);
  const dmmf = await getDMMF({
    datamodel: options.datamodel,
    previewFeatures: prismaClientProvider.previewFeatures,
  });

  const dmmfDocument = new DmmfDocument(dmmf as PrismaDMMF.Document, {
    emitDMMF: parseStringBoolean(generatorConfig.emitDMMF),
    emitTranspiledCode: parseStringBoolean(generatorConfig.emitTranspiledCode),
    simpleResolvers: parseStringBoolean(generatorConfig.simpleResolvers),
    useOriginalMapping: parseStringBoolean(generatorConfig.useOriginalMapping),
    useUncheckedScalarInputs: parseStringBoolean(
      generatorConfig.useUncheckedScalarInputs,
    ),
    emitIdAsIDType: parseStringBoolean(generatorConfig.emitIdAsIDType),
    customPrismaImportPath: generatorConfig.customPrismaImportPath,
    outputDirPath: outputDir,
    relativePrismaOutputPath: toUnixPath(
      path.relative(outputDir, prismaClientPath),
    ),
    absolutePrismaOutputPath: prismaClientPath.includes('node_modules')
      ? '@prisma/client'
      : undefined,
    blocksToEmit: getBlocksToEmit(
      parseStringArray(
        generatorConfig.emitOnly,
        'emitOnly',
        ALL_EMIT_BLOCK_KINDS,
      ),
    ),
    contextPrismaKey: generatorConfig.contextPrismaKey ?? 'prisma',
  });

  const emitTranspiledCode =
    parseStringBoolean(generatorConfig.emitTranspiledCode) ??
    outputDir.includes('node_modules');
  const project = new Project({
    compilerOptions: {
      target: ScriptTarget.Latest,
      module: ModuleKind.CommonJS,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      esModuleInterop: true,
      declaration: true,
      importHelpers: true,
      ...(emitTranspiledCode && {
        declaration: true,
        importHelpers: true,
      }),
    },
  });

  generateApiResponse(project, outputDir, dmmfDocument.datamodel.models);

  dmmfDocument.datamodel.models.forEach((model) => {
    const modelName = camelCase(model.name);

    const filePath = path.resolve(
      outputDir,
      `${modelName}/${modelName}.module.ts`,
    );

    if (fs.existsSync(filePath)) {
      return;
    }

    generateInputCreate(project, outputDir, model);
    generateInputUpdate(project, outputDir, model);
    generateInputFilter(project, outputDir, model);
    generateInputUpdateMany(project, outputDir, model);
    generateOutput(project, outputDir, model);
    generateController(project, outputDir, model);
    generateService(project, outputDir, model);
    generateModule(project, outputDir, model);
  });

  for (const sourceFile of project.getSourceFiles()) {
    sourceFile
      .fixMissingImports()
      .organizeImports()
      .fixUnusedIdentifiers()
      .formatText();
  }

  try {
    if (emitTranspiledCode) {
      await project.emit();
    } else {
      for (const file of project.getSourceFiles()) {
        file.formatText({ indentSize: 2 });
      }

      await project.save();
    }
  } catch (err) {
    console.error('Error: unable to write files for generator');

    throw err;
  }
}