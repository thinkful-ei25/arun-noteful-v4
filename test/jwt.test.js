'use strict';

const { expect } = require('chai');
const jsonwebtoken = require('jsonwebtoken');

const { createAuthToken } = require('../auth/tokens');
const { JWT_SECRET } = require('../config');

describe('Auth token lifecycle', () => {
  describe('createAuthToken', () => {
    it('should return a JWT token with a payload assigned to `user`', function () {
      const fixture = { username: 'testuser', a: 'my data' };
      const token = createAuthToken(fixture);
      const encodedPayload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
      expect(payload.user).to.deep.equal(fixture);
    });

    it('should return a JWT token with a valid signature/hash', function () {
      const fixture = { username: 'testuser', a: 'my data' };
      const token = createAuthToken(fixture);
      expect(() => jsonwebtoken.verify(token, JWT_SECRET)).to.not.throw();
    });
  });
});
