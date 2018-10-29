'use strict';

function LoginError(message, location) {
  this.name = 'LoginError';
  this.reason = this.name;
  this.message = message;
  this.location = location;

  this.stack = Error.captureStackTrace(this, LoginError);
}
LoginError.prototype = Object.create(Error.prototype);
LoginError.prototype.constructor = LoginError;

module.exports = {
  LoginError,
};
