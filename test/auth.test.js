'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const jsonwebtoken = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');
const server = require('../server');
const tokens = require('../auth/tokens');
const User = require('../models/user');
const utils = require('./utils');

const { expect } = chai;
chai.use(chaiHttp);

describe('Authentication endpoints', () => {
  before(utils.connectToDatabase);
  after(utils.disconnectFromDatabase);
  afterEach(utils.cleanDatabase);

  const user = {
    username: 'aseehra',
    password: 'thisismypasswordtherearemanylikeitbutthisoneismind',
    fullname: 'Arun Seehra',
  };

  // prettier-ignore
  beforeEach(() => User
    .hashPassword(user.password)
    .then(digest => User.create(Object.assign({}, user, { password: digest }))));

  describe('POST /api/login', () => {
    const url = '/api/login';

    context('with valid credentials', () => {
      it('should return a valid JWT', function () {
        return chai
          .request(server)
          .post(url)
          .send(user)
          .then((res) => {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.include.all.keys('authToken');

            let payload;
            expect(() => {
              payload = jsonwebtoken.verify(res.body.authToken, JWT_SECRET, {
                subject: user.username,
              });
            }).to.not.throw();
            expect(payload.user).to.exist;
            expect(payload.user).to.have.all.keys('username', 'fullname', 'id');
          });
      });
    });

    context('with invalid creditials', () => {
      it('should return 401 if (username, password) are not found ', function () {
        return Promise.all([
          chai
            .request(server)
            .post(url)
            .send({ username: 'aseehra', password: 'haha' }),
          chai
            .request(server)
            .post(url)
            .send({ username: 'brendan', password: 'haha' }),
        ]).then((results) => {
          results.forEach((res) => {
            expect(res).to.have.status(401);
          });
        });
      });

      it('should reutrn 400 if username or password fields are missing', function () {
        return Promise.all([
          chai
            .request(server)
            .post(url)
            .send({ password: 'haha' }),
          chai
            .request(server)
            .post(url)
            .send({ username: 'aseehra' }),
        ]).then((results) => {
          results.forEach((res) => {
            expect(res).to.have.status(400);
          });
        });
      });
    });
  });

  describe('POST /api/refresh', () => {
    const requester = chai.request(server).post('/api/refresh');

    it('should return a new, valid authToken', () => {
      const authToken = tokens.createAuthToken(user);
      requester.set('Authorization', `Bearer ${authToken}`).then((res) => {
        expect(res.authToken).to.not.equal(authToken);
        expect(() => jsonwebtoken.verify(res.body.authToken, JWT_SECRET, {
          subject: user.username,
        })).to.not.throw();
      });
    });
  });
});
