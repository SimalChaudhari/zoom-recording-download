const { validationResult, query, body, param, matchedData } = require('express-validator');

const validateRequest = (fields, source = 'body', optional = false) => {
  return async (req, res, next) => {
    try {
      const validations = fields.map((field) => {
        if (source === 'query') {
          return optional ? query(field).optional() : query(field).notEmpty().withMessage(`${field} is required`);
        } else if (source === 'param') {
          return param(field).notEmpty().withMessage(`${field} is required`);
        } else {
          return optional ? body(field).optional() : body(field).notEmpty().withMessage(`${field} is required`);
        }
      });

      // Apply validations
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Pass only validated data to controllers
      req.validated = matchedData(req, { locations: [source] });
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validateRequest;
