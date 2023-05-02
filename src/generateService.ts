import * as path from 'path';
import { Project } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase } from './helpers';

export const generateService = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const modelName = camelCase(model.name);
  const filePath = path.resolve(
    outputDir,
    `${modelName}/${modelName}.service.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(`import { Injectable } from '@nestjs/common';
    import { PrismaService } from '../../../modules/shared/prisma/prisma.service';
    import { Prisma } from '@prisma/client';
    import { Create${model.name}Dto } from './dto/Create${model.name}.dto';
    import { Update${model.name}Dto } from './dto/Update${model.name}.dto';
    import { Filter${model.name}Dto } from './dto/Filter${model.name}.dto';
    import { UpdateMany${model.name}Dto } from './dto/UpdateMany${model.name}.dto';
    import { ${model.name} } from './entities/${modelName}.entity';
    
    @Injectable()
    export class ${model.name}Service {
        constructor(private readonly prismaService: PrismaService) {}
    
        create(data: Create${model.name}Dto): Promise<${model.name}> {
          return this.prismaService.${modelName}.create({ data });
        }

        upsert({
          where,
          data
        }: UpdateMany${model.name}Dto): Promise<${model.name}> {
          return this.prismaService.${modelName}.upsert({
            where,
            update: data,
            create: data,
          });
        }

        getAll(): Promise<Array<${model.name}>> {
          return this.prismaService.${modelName}.findMany();
        }

        getById(id: string): Promise<${model.name}> {
          return this.prismaService.${modelName}.findUnique({
            where: {
              id,
            },
          });
        }

        filter(where: Filter${model.name}Dto): Promise<Array<${model.name}>> {
          if (where.includeDeleted) {
            return this.getAllWithDeleted(where);
          }

          return this.prismaService.${modelName}.findMany({
            where,
          });
        }

        async update({
          id,
          ...data
        }: Update${model.name}Dto): Promise<${model.name}> {
          const ${modelName}Exists =
            await this.prismaService.${modelName}.findUnique({
              where: {
                id,
              },
            });

          if (!${modelName}Exists) {
            throw new Error(\`The ${modelName} id \${id} is not exists\`);
          }

          return this.prismaService.${modelName}.update({
            where: {
              id,
            },
            data,
          });
        }

        async updateMany({ where, data }: UpdateMany${model.name}Dto): Promise<number> {
          delete data.id;

          const result = await this.prismaService.${modelName}.updateMany({
            where,
            data,
          });

          return result.count;
        }

        remove(id: string): void {
          this.prismaService.${modelName}.delete({
            where: {
              id,
            },
          });
        }

        getAllWithDeleted(where: Prisma.${model.name}WhereInput) {
          return this.prismaService.getAllWithDeleted('${modelName}', where);
        }
      
        permanentDeletion(where: Prisma.${model.name}WhereInput) {
          return this.prismaService.delete('${modelName}', where);
        }
    }`);
};
