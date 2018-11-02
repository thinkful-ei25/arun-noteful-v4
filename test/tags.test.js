'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const sinon = require('sinon');

const app = require('../server');
const Tag = require('../models/tag');
const Note = require('../models/note');
const User = require('../models/user');
const utils = require('./utils');

chai.use(chaiHttp);
const { expect } = chai;
const sandbox = sinon.createSandbox();

describe('Noteful API - Tags', function () {
  let userId;
  let bearerAuth;

  before(() => utils.connectToDatabase());
  after(() => utils.disconnectFromDatabase());

  beforeEach(() => utils
    .seedDatabase()
    .then(() => utils.generateBearerToken())
    .then((obj) => {
      ({ userId, bearerAuth } = obj);
    }));
  afterEach(() => {
    sandbox.restore();
    return utils.cleanDatabase();
  });

  describe('GET /api/tags', function () {
    it('should return the correct number of tags', function () {
      return Promise.all([
        Tag.find({ userId }),
        chai
          .request(app)
          .get('/api/tags')
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
        Tag.find({ userId }).sort('name'),
        chai
          .request(app)
          .get('/api/tags')
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
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      return chai
        .request(app)
        .get('/api/tags')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('GET /api/tags/:id', function () {
    it('should return correct tags', function () {
      let data;
      return Tag.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/tags/${data.id}`)
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
        .get('/api/tags/NOT-A-VALID-ID')
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
        .get('/api/tags/DOESNOTEXIST')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      return Tag.findOne({ userId })
        .then(data => chai
          .request(app)
          .get(`/api/tags/${data.id}`)
          .set('Authorization', bearerAuth))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('POST /api/tags', function () {
    it('should create and return a new item when provided valid data', function () {
      const newItem = { name: 'newTag' };
      let body;
      return chai
        .request(app)
        .post('/api/tags')
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
          return Tag.findOne({ _id: body.id });
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
        .post('/api/tags')
        .set('Authorization', bearerAuth)
        .send(newItem)
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
        .post('/api/tags')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Tag.findOne({ userId })
        .then((data) => {
          const newItem = { name: data.name };
          return chai
            .request(app)
            .post('/api/tags')
            .set('Authorization', bearerAuth)
            .send(newItem);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Tag name already exists');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      const newItem = { name: 'newTag' };
      return chai
        .request(app)
        .post('/api/tags')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it('should not allow a user to create tags on behalf of another user', function () {
      return User.findOne({ _id: { $ne: userId } })
        .then((otherUser) => {
          const fixture = {
            name: '<Insert of game of throne spoiler here>',
            userId: otherUser.id,
          };
          return chai
            .request(app)
            .post('/api/tags')
            .set('Authorization', bearerAuth)
            .send(fixture);
        })
        .then((res) => {
          expect(res).to.have.status(403);
        });
    });
  });

  describe('PUT /api/tags/:id', function () {
    it('should update the tag', function () {
      const updateItem = { name: 'Updated Name' };
      let data;
      return Tag.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/tags/${data.id}`)
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
        .put('/api/tags/NOT-A-VALID-ID')
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
        .put('/api/tags/DOESNOTEXIST')
        .set('Authorization', bearerAuth)
        .send(updateItem)
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateItem = {};
      let data;
      return Tag.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/tags/${data.id}`)
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
      return Tag.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/tags/${data.id}`)
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
      return Tag.find({ userId })
        .limit(2)
        .then((results) => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai
            .request(app)
            .put(`/api/tags/${item1.id}`)
            .set('Authorization', bearerAuth)
            .send(item1);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Tag name already exists');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      const updateItem = { name: 'Updated Name' };
      return Tag.findOne({ userId })
        .then(data => chai
          .request(app)
          .put(`/api/tags/${data.id}`)
          .set('Authorization', bearerAuth)
          .send(updateItem))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it("should prevent users from overwriting someone else's tags", function () {
      return User.findOne({ _id: { $ne: userId } })
        .then(otherUser => Tag.findOne({ userId: otherUser.id }))
        .then((tag) => {
          const fixture = { name: '<GoT Spoiler>' };
          return chai
            .request(app)
            .put(`/api/tags/${tag.id}`)
            .set('Authorization', bearerAuth)
            .send(fixture);
        })
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should prevent transfering a tag to another user', function () {
      let otherUser;
      return User.findOne({ _id: { $ne: userId } })
        .then((aUser) => {
          otherUser = aUser;
        })
        .then(() => Tag.findOne({ userId }))
        .then((tag) => {
          expect(tag).to.exist;
          const fixture = Object.assign(tag.toObject(), { userId: otherUser.id });
          return chai
            .request(app)
            .put(`/api/tags/${tag.id}`)
            .set('Authorization', bearerAuth)
            .send(fixture);
        })
        .then((res) => {
          expect(res).to.have.status(403);
        });
    });
  });

  describe('DELETE /api/tags/:id', function () {
    it('should delete an existing tag and respond with 204', function () {
      let data;
      return Tag.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .delete(`/api/tags/${data.id}`)
            .set('Authorization', bearerAuth);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Tag.countDocuments({ _id: data.id });
        })
        .then((count) => {
          expect(count).to.equal(0);
        });
    });

    it('should delete an existing tag and remove tag reference from note', function () {
      let tagId;
      return Note.findOne({ tags: { $exists: true, $ne: [] }, userId })
        .then((data) => {
          [tagId] = data.tags;

          return chai
            .request(app)
            .delete(`/api/tags/${tagId}`)
            .set('Authorization', bearerAuth);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Note.countDocuments({ tags: tagId });
        })
        .then((count) => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai
        .request(app)
        .delete('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      return Tag.findOne({ userId })
        .then(data => chai
          .request(app)
          .delete(`/api/tags/${data.id}`)
          .set('Authorization', bearerAuth))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it("should not delete another user's tags", function () {
      let fixture;
      return User.findOne({ _id: { $ne: userId } })
        .then(otherUser => Tag.findOne({ userId: otherUser.id }))
        .then((tag) => {
          fixture = tag;
          return chai
            .request(app)
            .delete(`/api/tags/${tag.id}`)
            .set('Authorization', bearerAuth);
        })
        .then((res) => {
          expect(res).to.have.status(204);
        })
        .then(() => Tag.countDocuments({ _id: fixture.id }))
        .then((count) => {
          expect(count).to.equal(1);
        });
    });

    it("should not cascade for another user's tags", function () {
      let fixture;
      let originalCount;
      return User.findOne({ _id: { $ne: userId } })
        .then(otherUser => Tag.findOne({ userId: otherUser.id }))
        .then((tag) => {
          fixture = tag;
          return Note.countDocuments({ tags: fixture.id });
        })
        .then((count) => {
          originalCount = count;
        })
        .then(() => chai
          .request(app)
          .delete(`/api/tags/${fixture.id}`)
          .set('Authorization', bearerAuth))
        .then(() => Note.countDocuments({ tags: fixture.id }))
        .then((count) => {
          expect(count).to.equal(originalCount);
        });
    });
  });
});
