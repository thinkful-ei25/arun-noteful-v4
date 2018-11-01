'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const sinon = require('sinon');

const app = require('../server');
const Folder = require('../models/folder');
const Note = require('../models/note');
const User = require('../models/user');
const utils = require('./utils');

chai.use(chaiHttp);
const { expect } = chai;
const sandbox = sinon.createSandbox();

describe('Noteful API - Folders', function () {
  let userId;
  let bearerAuth;

  before(utils.connectToDatabase);
  after(utils.disconnectFromDatabase);

  beforeEach(function () {
    return utils
      .seedDatabase()
      .then(() => utils.generateBearerToken())
      .then((obj) => {
        ({ userId, bearerAuth } = obj);
      });
  });

  afterEach(function () {
    sandbox.restore();
    return utils.cleanDatabase();
  });

  describe('GET /api/folders', function () {
    it('should return a list sorted with the correct number of folders', function () {
      return Promise.all([
        Folder.find({ userId }).sort('name'),
        chai
          .request(app)
          .get('/api/folders')
          .set('Authorization', bearerAuth),
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });

    // eslint-disable-next-line max-len
    it('should return a list sorted by name with the correct fields and values', function () {
      return Promise.all([
        Folder.find({ userId }).sort('name'),
        chai
          .request(app)
          .get('/api/folders')
          .set('Authorization', bearerAuth),
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
        res.body.forEach(function (item, i) {
          expect(item).to.be.a('object');
          expect(item).to.have.all.keys(
            'id',
            'name',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(item.id).to.equal(data[i].id);
          expect(item.name).to.equal(data[i].name);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');
      return chai
        .request(app)
        .get('/api/folders')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('GET /api/folders/:id', function () {
    it('should return correct folder', function () {
      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys(
            'id',
            'name',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai
        .request(app)
        .get('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai
        .request(app)
        .get('/api/folders/DOESNOTEXIST')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');

      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth);
        })
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('POST /api/folders', function () {
    it('should create and return a new item when provided valid data', function () {
      const newItem = { name: 'newFolder' };
      let body;
      return chai
        .request(app)
        .post('/api/folders')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then(function (res) {
          ({ body } = res);
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.a('object');
          expect(body).to.have.all.keys(
            'id',
            'name',
            'createdAt',
            'updatedAt',
            'userId',
          );
          return Folder.findById(body.id);
        })
        .then((data) => {
          expect(body.id).to.equal(data.id);
          expect(body.name).to.equal(data.name);
          expect(new Date(body.createdAt)).to.eql(data.createdAt);
          expect(new Date(body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', function () {
      const newItem = {};
      return chai
        .request(app)
        .post('/api/folders')
        .send(newItem)
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when "name" field is empty string', function () {
      const newItem = { name: '' };
      return chai
        .request(app)
        .post('/api/folders')
        .send(newItem)
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.findOne()
        .then((data) => {
          const newItem = { name: data.name };
          return chai
            .request(app)
            .post('/api/folders')
            .set('Authorization', bearerAuth)
            .send(newItem);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');

      const newItem = { name: 'newFolder' };
      return chai
        .request(app)
        .post('/api/folders')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it('should not create a folder assigned to another user', function () {
      return User.findOne({ _id: { $ne: userId } })
        .then((otherUser) => {
          const newFolder = { name: 'Test', userId: otherUser.id };
          return chai
            .request(app)
            .post('/api/folders')
            .set('Authorization', bearerAuth)
            .send(newFolder);
        })
        .then((res) => {
          expect(res).to.have.status(403);
        });
    });
  });

  describe('PUT /api/folders/:id', function () {
    it('should update the folder', function () {
      const updateItem = { name: 'Updated Name' };
      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys(
            'id',
            'name',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateItem.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect item to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      const updateItem = { name: 'Blah' };
      return chai
        .request(app)
        .put('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', bearerAuth)
        .send(updateItem)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      const updateItem = { name: 'Blah' };
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai
        .request(app)
        .put('/api/folders/DOESNOTEXIST')
        .set('Authorization', bearerAuth)
        .send(updateItem)
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateItem = {};
      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when "name" field is empty string', function () {
      const updateItem = { name: '' };
      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.find({ userId })
        .limit(2)
        .then((results) => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai
            .request(app)
            .put(`/api/folders/${item1.id}`)
            .set('Authorization', bearerAuth)
            .send(item1);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');

      const updateItem = { name: 'Updated Name' };
      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it('should return 403 if attempting to change userId', function () {
      let otherUser;
      return User.findOne({ _id: { $ne: userId } })
        .then((user) => {
          otherUser = user;
        })
        .then(() => Folder.findOne({ userId }))
        .then((folder) => {
          expect(folder).to.exist;
          const update = Object.assign(folder.toObject(), { userId: otherUser.id });
          return chai
            .request(app)
            .put(`/api/folders/${folder.id}`)
            .set('Authorization', bearerAuth)
            .send(update);
        })
        .then((res) => {
          expect(res).to.have.status(403);
          expect(res).to.be.json;
          expect(res.body.message).to.equal(
            'Cannot transfer folder to a different user',
          );
        });
    });

    // eslint-disable-next-line max-len
    it("should return 404 if attempting to overwrite another user's folder", function () {
      return User.findOne({ _id: { $ne: userId } })
        .then(user => Folder.findOne({ userId: user.id }))
        .then((folder) => {
          const update = Object.assign(folder.toObject(), { userId });
          return chai
            .request(app)
            .put(`/api/folders/${folder.id}`)
            .set('Authorization', bearerAuth)
            .send(update);
        })
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });
  });

  describe('DELETE /api/folders/:id', function () {
    it('should delete an existing folder and respond with 204', function () {
      let data;
      return Folder.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .delete(`/api/folders/${data.id}`)
            .set('Authorization', bearerAuth);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Folder.countDocuments({ _id: data.id });
        })
        .then((count) => {
          expect(count).to.equal(0);
        });
    });

    // eslint-disable-next-line max-len
    it('should delete an existing folder and remove folderId reference from note', function () {
      let folderId;
      return Note.findOne({ folderId: { $exists: true }, userId })
        .then((data) => {
          ({ folderId } = data);
          return chai
            .request(app)
            .delete(`/api/folders/${folderId}`)
            .set('Authorization', bearerAuth);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Note.countDocuments({ folderId });
        })
        .then((count) => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai
        .request(app)
        .delete('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      return Folder.findOne({ userId })
        .then(data => chai
          .request(app)
          .delete(`/api/folders/${data.id}`)
          .set('Authorization', bearerAuth))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it("should not delete another user's folder", function () {
      let fixture;
      return User.findOne({ _id: { $ne: userId } })
        .then(user => Folder.findOne({ userId: user.id }))
        .then((folder) => {
          fixture = folder;
          return chai
            .request(app)
            .delete(`/api/folders/${fixture.id}`)
            .set('Authorization', bearerAuth);
        })
        .then((res) => {
          expect(res).to.have.status(204);
        })
        .then(() => Folder.countDocuments({ _id: fixture.id }))
        .then((count) => {
          expect(count).to.equal(1);
        });
    });
  });
});
