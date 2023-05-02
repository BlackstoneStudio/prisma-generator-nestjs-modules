import { Field } from './field.interface';
import * as prettier from 'prettier';
import * as fs from 'fs';
import * as path from 'path';

export class Helper {
  static getType(type: string): string {
    const lowerType = type.toLocaleLowerCase();

    if (lowerType === 'int') {
      return 'number';
    } else if (lowerType === 'string') {
      return 'string';
    }

    return 'any';
  }

  static getValidation(type: string): string | undefined {
    const lowerType = type.toLocaleLowerCase();

    if (lowerType === 'int') {
      return 'IsNumber';
    } else if (lowerType === 'string') {
      return 'IsString';
    }

    return undefined;
  }

  static getField(field: Field) {
    let stringField = '@ApiProperty()\n';
    const type = Helper.getType(field.type);
    const validation = Helper.getValidation(field.type);

    if (validation) {
      stringField += `@${validation}()\n`;
    }

    stringField += `${field.name}: ${type};`;

    return stringField;
  }

  static getImport(fields: Array<Field>) {
    const validations = new Set();
    fields.forEach((field) =>
      validations.add(Helper.getValidation(field.type)),
    );

    return `import {
      ${[...validations].join(',\n')}
    } from 'class-validator';`;
  }

  static formatFile(content: string): Promise<string> {
    return new Promise((res, rej) =>
      prettier.resolveConfig(process.cwd()).then((options) => {
        if (!options) {
          res(content); // no prettier config was found, no need to format
        }

        try {
          const formatted = prettier.format(content, {
            ...options,
            parser: 'typescript',
          });

          res(formatted);
        } catch (err) {
          rej(err);
        }
      }),
    );
  }

  static async writeFileSafely(
    writeLocation: string,
    content: any,
  ): Promise<void> {
    fs.mkdirSync(path.dirname(writeLocation), {
      recursive: true,
    });

    fs.writeFileSync(writeLocation, await Helper.formatFile(content));
  }
}
