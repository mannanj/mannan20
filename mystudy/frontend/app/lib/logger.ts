type LogFields = Record<string, unknown>;

export const logger = {
  info(message: string, fields: LogFields = {}) {
    console.info(message, fields);
  },
  error(message: string, fields: LogFields = {}) {
    console.error(message, fields);
  },
};
