'use strict';

const jsonwebtoken = require('jsonwebtoken');

const { JWT_SECRET, JWT_EXPIRY } = require('../config');

module.exports = {
  createAuthToken(user) {
    return jsonwebtoken.sign({ user }, JWT_SECRET, {
      subject: user.username,
      expiresIn: JWT_EXPIRY,
    });
  },
};
