'use strict';

const bcrypt = require('bcryptjs');
const chai = require('chai');
const chaiHttp = require('chai-http');

const server = require('../server');
const User = require('../models/user');
const utils = require('./utils');

const { expect } = chai;
chai.use(chaiHttp);

describe('/api/users', () => {
  before(() => utils.connectToDatabase());
  afterEach(() => utils.cleanDatabase());
  after(() => utils.disconnectFromDatabase());

  describe('POST /', () => {
    describe('POST /', () => {
      const url = '/api/users';
      const user = { username: 'aseehra', password: 'thisisapassword' };

      it('should create a new user and return the user less her password', function () {
        return chai
          .request(server)
          .post(url)
          .send(user)
          .then((res) => {
            expect(res).to.have.status(201);
            expect(res).to.be.json;

            expect(res.body).to.include.all.keys('username', 'id');
            expect(res.body.username).to.equal(user.username);
            expect(res.body).to.not.include.all.keys('password');

            return User.findById(res.body.id);
          })
          .then((result) => {
            expect(result.username).to.equal(user.username);
            return bcrypt.compare(user.password, result.password);
          })
          .then((passwordIsCorrect) => {
            expect(passwordIsCorrect).to.be.true;
          });
      });

      it('should return 400 if the username already exists', function () {
        const fixture = {
          username: user.username,
          fullname: 'Arun Seehra',
          password: 'some great password',
        };
        return User.create(user)
          .then(() => chai
            .request(server)
            .post(url)
            .send(fixture))
          .then((res) => {
            expect(res).to.have.status(400);
          });
      });

      // eslint-disable-next-line max-len
      it('should return 400 if the username or password fields are missing', function () {
        return Promise.all([
          chai
            .request(server)
            .post(url)
            .send({ username: user.username }),
          chai
            .request(server)
            .post(url)
            .send({ password: user.password }),
        ]).then((results) => {
          results.forEach((res) => {
            expect(res).to.have.status(400);
          });
        });
      });

      it('should return 422 if the password is outside the length bounds', function () {
        return Promise.all([
          chai
            .request(server)
            .post(url)
            .send({
              username: user.username,
              password: 'haha',
            }),
          chai
            .request(server)
            .post(url)
            .send({
              username: user.username,
              password:
                // eslint-disable-next-line max-len
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer at metus',
            }),
        ]).then((results) => {
          results.forEach((res) => {
            expect(res).to.have.status(422);
          });
        });
      });

      // eslint-disable-next-line max-len
      it('should return 422 if there is leading/trailng whitespace in either field', function () {
        return Promise.all([
          chai
            .request(server)
            .post(url)
            .send({ username: user.username, password: ' hahahahahahahhahahahaa' }),
          chai
            .request(server)
            .post(url)
            .send({ username: ' arun', password: user.password }),
        ]).then((results) => {
          results.forEach((res) => {
            expect(res).to.have.status(422);
          });
        });
      });
    });
  });
});
