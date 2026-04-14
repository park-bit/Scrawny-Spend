'use strict';

const AppError = require('../utils/AppError');

const validate = (schema, property = 'body') => {
  return (req, _res, next) => {
    const source = req[property] || {};

    const { error, value } = schema.validate(source, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }

    Object.defineProperty(req, property, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    next();
  };
};

module.exports = { validate };