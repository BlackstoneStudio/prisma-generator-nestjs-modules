import * as path from 'path';
import { Project } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { camelCase, snakeCase } from './helpers';
import pluralize from 'pluralize';

export const generateController = (
  project: Project,
  outputDir: string,
  model: DMMF.Model,
) => {
  const modelName = camelCase(model.name);
  const pathName = snakeCase(model.name);
  const modelNameUpper = modelName.toLocaleUpperCase();
  const filePath = path.resolve(
    outputDir,
    `${pathName}/${pathName}.controller.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(`import { Response } from 'express';
    import { ApiResponse, ApiTags } from '@nestjs/swagger';
    import {
      Body,
      Controller,
      Delete,
      Get,
      Logger,
      Param,
      Post,
      Put,
      Query,
      Res,
    } from '@nestjs/common';
    import Success from '../utils/success.dictionary';
    import Errors, { CommonErrosResposes } from '../utils/error.dictionary';
    import { Create${model.name}Dto } from './dto/create-${pathName}.dto';
    import { Update${model.name}Dto } from './dto/update-${pathName}.dto';
    import { UpdateMany${model.name}Dto } from './dto/update-many${
      pathName
    }.dto';
    import { ${model.name}Service } from './${pathName}.service';
    import { Filter${model.name}Dto } from './dto/filter-${pathName}.dto';
    
    @ApiTags('${modelName}')
    @Controller('${modelName}')
    @CommonErrosResposes()
    export class ${model.name}Controller {
      private logger = new Logger(${model.name}Controller.name);

      constructor(private readonly service: ${model.name}Service) {}

      @Post()
      @ApiResponse(Success.CREATE_${modelNameUpper})
      @ApiResponse(Errors.CREATE_${modelNameUpper}_FAILED)
      async create(@Body() dto: Create${model.name}Dto, @Res() res: Response) {
        try {
          const new${model.name} = await this.service.create(dto);

          if (!new${model.name}) {
            return res
              .status(Errors.CREATE_${modelNameUpper}_FAILED.status)
              .send(Errors.CREATE_${modelNameUpper}_FAILED);
          }

          return res.status(Success.CREATE_${modelNameUpper}.status).send(new${
    model.name
  });
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Post()
      @ApiResponse(Success.CREATE_${modelNameUpper})
      @ApiResponse(Errors.CREATE_${modelNameUpper}_FAILED)
      async upsert(@Body() dto: UpdateMany${
        model.name
      }Dto, @Res() res: Response) {
        try {
          const new${model.name} = await this.service.upsert(dto);

          if (!new${model.name}) {
            return res
              .status(Errors.CREATE_${modelNameUpper}_FAILED.status)
              .send(Errors.CREATE_${modelNameUpper}_FAILED);
          }

          return res.status(Success.CREATE_${modelNameUpper}.status).send(new${
    model.name
  });
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Get()
      @ApiResponse(Success.GET_ALL_${pluralize(modelNameUpper)})
      @ApiResponse(Errors.GET_ALL_${pluralize(modelNameUpper)}_NOT_FOUND)
      async findMany(@Res() res: Response) {
        try {
          const ${pluralize(modelName)} = await this.service.getAll();

          if (!${pluralize(modelName)}.length) {
            return res
              .status(Errors.GET_ALL_${pluralize(
                modelNameUpper,
              )}_NOT_FOUND.status)
              .send(Errors.GET_ALL_${pluralize(modelNameUpper)}_NOT_FOUND);
          }

          return res.status(Success.GET_ALL_${pluralize(
            modelNameUpper,
          )}.status).send(${pluralize(modelName)});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Get('/filter')
      @ApiResponse(Success.FILTER_${pluralize(modelNameUpper)})
      @ApiResponse(Errors.FILTER_${pluralize(modelNameUpper)}_NOT_FOUND)
      async filter(@Query() filter: Filter${
        model.name
      }Dto, @Res() res: Response) {
        try {
          const ${pluralize(modelName)} = await this.service.filter(filter);

          if (!${pluralize(modelName)}.length) {
            return res
              .status(Errors.FILTER_${pluralize(
                modelNameUpper,
              )}_NOT_FOUND.status)
              .send(Errors.FILTER_${pluralize(modelNameUpper)}_NOT_FOUND);
          }

          return res.status(Success.FILTER_${pluralize(
            modelNameUpper,
          )}.status).send(${pluralize(modelName)});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Get('/:id')
      @ApiResponse(Success.GET_${modelNameUpper}_BY_ID)
      @ApiResponse(Errors.GET_${modelNameUpper}_BY_ID_NOT_FOUND)
      async findOne(@Param('id') id: string, @Res() res: Response) {
        try {
          const ${modelName} = await this.service.getById(id);

          if (!${modelName}) {
            return res
              .status(Errors.GET_${modelNameUpper}_BY_ID_NOT_FOUND.status)
              .send(Errors.GET_${modelNameUpper}_BY_ID_NOT_FOUND);
          }

          return res.status(Success.GET_${modelNameUpper}_BY_ID.status).send(${modelName});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Put()
      @ApiResponse(Success.UPDATE_${modelNameUpper})
      @ApiResponse(Errors.UPDATE_${modelNameUpper}_NOT_FOUND)
      async update(@Body() dto: Update${model.name}Dto, @Res() res: Response) {
        try {
          const ${modelName} = await this.service.update(dto);

          if (!${modelName}) {
            return res
              .status(Errors.UPDATE_${modelNameUpper}_NOT_FOUND.status)
              .send(Errors.UPDATE_${modelNameUpper}_NOT_FOUND);
          }

          return res.status(Success.UPDATE_${modelNameUpper}.status).send(${modelName});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Put()
      @ApiResponse(Success.UPDATE_MANY_${pluralize(modelNameUpper)})
      @ApiResponse(Errors.UPDATE_${modelNameUpper}_NOT_FOUND)
      async updateMany(@Body() dto: UpdateMany${
        model.name
      }Dto, @Res() res: Response) {
        try {
          const ${pluralize(modelName)} = await this.service.updateMany(dto);

          if (${pluralize(modelName)} <= 0) {
            return res
              .status(Errors.UPDATE_${modelNameUpper}_NOT_FOUND.status)
              .send(Errors.UPDATE_${modelNameUpper}_NOT_FOUND);
          }

          return res.status(Success.UPDATE_MANY_${pluralize(
            modelNameUpper,
          )}.status).send(${pluralize(modelName)});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Delete('/:id')
      @ApiResponse(Success.DELETE_${modelNameUpper})
      async remove(@Param('id') id: string, @Res() res: Response) {
        try {
          await this.service.remove(id);

          return res.status(Success.DELETE_${modelNameUpper}.status).send(Success.DELETE_${modelNameUpper});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }

      @Delete('permanently')
      @ApiResponse(Success.DELETE_${modelNameUpper})
      async removePermanently(@Body() filter: Filter${
        model.name
      }Dto, @Res() res: Response) {
        try {
          await this.service.permanentDeletion(filter);

          return res.status(Success.DELETE_${modelNameUpper}.status).send(Success.DELETE_${modelNameUpper});
        } catch (err) {
          this.logger.error(err);

          return res.status(Errors.UNKNOWN_ERROR.status).send(Errors.UNKNOWN_ERROR);
        }
      }
    }`);
};
