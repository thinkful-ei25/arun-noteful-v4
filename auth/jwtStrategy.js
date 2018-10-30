'use strict';

const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { JWT_SECRET } = require('../config');

const strategyOptions = {
  secretOrKey: JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  algorithms: ['HS256'],
};

const jwtStrategy = new JwtStrategy(strategyOptions, (payload, done) => {
  done(null, payload.user);
});

module.exports = jwtStrategy;
