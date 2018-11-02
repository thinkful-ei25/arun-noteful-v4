'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const sinon = require('sinon');

const app = require('../server');
const Folder = require('../models/folder');
const Note = require('../models/note');
const Tag = require('../models/tag');
const User = require('../models/user');
const utils = require('./utils');

chai.use(chaiHttp);
const { expect } = chai;
const sandbox = sinon.createSandbox();

describe('Noteful API - Notes', function () {
  let userId;
  let bearerAuth;

  before(utils.connectToDatabase);
  after(utils.disconnectFromDatabase);

  beforeEach(() => utils
    .seedDatabase()
    .then(utils.generateBearerToken)
    .then((obj) => {
      ({ userId, bearerAuth } = obj);
    }));

  afterEach(() => {
    sandbox.restore();
    return utils.cleanDatabase();
  });

  function fetchADifferentUser(id) {
    return User.findOne({ _id: { $ne: id } });
  }

  describe('GET /api/notes', function () {
    it('should return the correct number of Notes', function () {
      return Promise.all([
        Note.find({ userId }),
        chai
          .request(app)
          .get('/api/notes')
          .set('Authorization', bearerAuth),
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });

    it('should return a list sorted desc with the correct right fields', function () {
      return Promise.all([
        Note.find({ userId }).sort({ updatedAt: 'desc' }),
        chai
          .request(app)
          .get('/api/notes')
          .set('Authorization', bearerAuth),
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
        res.body.forEach(function (item, i) {
          expect(item).to.be.a('object');
          // Note: folderId, tags and content are optional
          expect(item).to.include.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt',
            'tags',
            'userId',
          );
          expect(item.id).to.equal(data[i].id);
          expect(item.title).to.equal(data[i].title);
          expect(item.content).to.equal(data[i].content);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should return correct search results for a title search', function () {
      const searchTerm = 'lady gaga';

      const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        $or: [{ title: re }, { content: re }],
        userId,
      }).sort({
        updatedAt: 'desc',
      });

      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', bearerAuth);

      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
        res.body.forEach(function (item, i) {
          expect(item).to.be.a('object');
          expect(item).to.include.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt',
            'userId',
          ); // Note: folderId and content are optional
          expect(item.id).to.equal(data[i].id);
          expect(item.title).to.equal(data[i].title);
          expect(item.content).to.equal(data[i].content);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should return correct search results for content search', function () {
      const searchTerm = 'lorem ipsum';
      const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        $or: [{ title: re }, { content: re }],
        userId,
      }).sort({
        updatedAt: 'desc',
      });
      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', bearerAuth);

      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
        res.body.forEach(function (item, i) {
          expect(item).to.be.a('object');
          expect(item).to.include.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt',
            'userId',
          ); // Note: folderId and content are optional
          expect(item.id).to.equal(data[i].id);
          expect(item.title).to.equal(data[i].title);
          expect(item.content).to.equal(data[i].content);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should return correct search results for a folderId query', function () {
      return Folder.findOne({ userId })
        .then(data => Promise.all([
          Note.find({ folderId: data.id }),
          chai
            .request(app)
            .get(`/api/notes?folderId=${data.id}`)
            .set('Authorization', bearerAuth),
        ]))
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return correct search results for a tagId query', function () {
      return Tag.findOne({ userId })
        .then(data => Promise.all([
          Note.find({ tags: data.id }),
          chai
            .request(app)
            .get(`/api/notes?tagId=${data.id}`)
            .set('Authorization', bearerAuth),
        ]))
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return an empty array for an incorrect query', function () {
      const searchTerm = 'NOT-A-VALID-QUERY';
      const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        $or: [{ title: re }, { content: re }],
        userId,
      }).sort({ updatedAt: 'desc' });
      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', bearerAuth);
      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toJSON, 'transform').throws('FakeError');

      return chai
        .request(app)
        .get('/api/notes')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('GET /api/notes/:id', function () {
    it('should return correct notes', function () {
      let data;
      return Note.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/notes/${data.id}`)
            .set('Authorization', bearerAuth);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          // Note: folderId, tags and content are optional
          expect(res.body).to.include.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    // eslint-disable-next-line max-len
    it('should respond with status 400 and an error message when `id` is not valid', function () {
      return chai
        .request(app)
        .get('/api/notes/NOT-A-VALID-ID')
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
        .get('/api/notes/DOESNOTEXIST')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toJSON, 'transform').throws('FakeError');
      return Note.findOne()
        .then(data => chai
          .request(app)
          .get(`/api/notes/${data.id}`)
          .set('Authorization', bearerAuth))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('POST /api/notes', function () {
    // eslint-disable-next-line max-len
    it('should create and return a new item when provided valid title and content', function () {
      const newItem = {
        title: 'The best article about cats ever!',
        content:
          // eslint-disable-next-line max-len
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...',
      };
      let res;
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt',
            'tags',
            'userId',
          );
          return Note.findById(res.body.id);
        })
        .then((data) => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    // eslint-disable-next-line max-len
    it('should create and return a new item when provided valid title (content optional)', function () {
      const newItem = {
        title: 'The best article about cats ever!',
      };
      let res;
      return chai
        .request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', bearerAuth)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt',
            'tags',
            'userId',
          );
          return Note.findOne({ _id: res.body.id });
        })
        .then((data) => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.not.exist;
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should create and return when folderId is an empty string', function () {
      const newItem = {
        title: 'The best article about cats ever!',
        folderId: '',
      };
      let res;
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt',
            'tags',
            'userId',
          );
          return Note.findOne({ _id: res.body.id });
        })
        .then((data) => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.folderId).to.not.exist;
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "title" field', function () {
      const newItem = {
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
      };
      return chai
        .request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error when "title" is empty string', function () {
      const newItem = { title: '' };
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error when `folderId` is not valid ', function () {
      const newItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
        folderId: 'NOT-A-VALID-ID',
      };
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The `folderId` is invalid');
        });
    });

    it('should return an error when a tag `id` is not valid ', function () {
      const newItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
        tags: ['NOT-A-VALID-ID'],
      };
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The `tags` array contains an invalid id');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toJSON, 'transform').throws('FakeError');

      const newItem = {
        title: 'The best article about cats ever!',
        content:
          // eslint-disable-next-line max-len
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...',
      };

      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', bearerAuth)
        .send(newItem)
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it('should prevent creating a note on behalf of another user', function () {
      let otherUser;
      let originalCount;
      return fetchADifferentUser(userId)
        .then((aUser) => {
          otherUser = aUser;
          return Note.countDocuments({ userId: otherUser.id });
        })
        .then((count) => {
          originalCount = count;
        })
        .then(() => {
          const fixture = { title: 'My amazing new thing', userId: otherUser.id };
          return chai
            .request(app)
            .post('/api/notes')
            .set('Authorization', bearerAuth)
            .send(fixture);
        })
        .then(res => expect(res).to.have.status(403))
        .then(() => Note.countDocuments({ userId: otherUser.id }))
        .then(count => expect(count).to.equal(originalCount));
    });

    it("should return 422 if attempting to use another user's tags", function () {
      const fixture = { title: '<GoT spoiler>' };
      return fetchADifferentUser(userId)
        .then(otherUser => Tag.findOne({ userId: otherUser.id }))
        .then(tag => chai
          .request(app)
          .post('/api/notes')
          .set('Authorization', bearerAuth)
          .send(Object.assign({}, fixture, { tags: [tag.id] })))
        .then((res) => {
          expect(res).to.have.status(422);
        });
    });

    it("should return 422 if attempting to use another user's folder", function () {
      const fixture = { title: '<GoT spoiler>' };
      return fetchADifferentUser(userId)
        .then(otherUser => Folder.findOne({ userId: otherUser.id }))
        .then(({ id: folderId }) => chai
          .request(app)
          .post('/api/notes')
          .set('Authorization', bearerAuth)
          .send(Object.assign({}, fixture, { folderId })))
        .then(res => expect(res).to.have.status(422));
    });
  });

  describe('PUT /api/notes/:id', function () {
    it('should update the note when provided a valid title', function () {
      const updateItem = {
        title: 'What about dogs?!',
      };
      let data;
      return Note.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(updateItem.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.folderId).to.deep.equal(data.folderId);
          expect(res.body.tags).to.deep.equal(data.tags);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should update the note when provided valid content', function () {
      const updateItem = {
        content: 'Lorem ipsum dolor sit amet...',
      };
      let data;
      return Note.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(updateItem.content);
          expect(res.body.folderId).to.deep.equal(data.folderId);
          expect(res.body.tags).to.deep.equal(data.tags);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should update the note when provided a valid folderId', function () {
      const updateItem = {};
      let data;

      return Promise.all([Folder.findOne({ userId }), Note.findOne({ userId })])
        .then(([folder, note]) => {
          updateItem.folderId = folder.id;
          data = note;
          return chai
            .request(app)
            .put(`/api/notes/${note.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.folderId).to.deep.equal(updateItem.folderId);
          expect(res.body.tags).to.deep.equal(data.tags);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should update the note when provided a valid tag', function () {
      const updateItem = {
        tags: [],
      };
      let data;

      return Promise.all([Tag.findOne({ userId }), Note.findOne({ userId })])
        .then(([tag, note]) => {
          updateItem.tags.push(tag.id);
          data = note;
          return chai
            .request(app)
            .put(`/api/notes/${note.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.folderId).to.deep.equal(data.folderId);
          expect(res.body.tags).to.deep.equal(updateItem.tags);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    // eslint-disable-next-line max-len
    it('should respond with status 400 and an error message when `id` is not valid', function () {
      const updateItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
      };
      return chai
        .request(app)
        .put('/api/notes/NOT-A-VALID-ID')
        .send(updateItem)
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      const updateItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
      };
      return chai
        .request(app)
        .put('/api/notes/DOESNOTEXIST')
        .set('Authorization', bearerAuth)
        .send(updateItem)
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when "title" is an empty string', function () {
      const updateItem = { title: '' };
      let data;
      return Note.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error when `folderId` is not valid ', function () {
      const updateItem = {
        folderId: 'NOT-A-VALID-ID',
      };
      return Note.findOne({ userId })
        .then(data => chai
          .request(app)
          .put(`/api/notes/${data.id}`)
          .set('Authorization', bearerAuth)
          .send(updateItem))
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The `folderId` is invalid');
        });
    });

    it('should unset a note folderId when provided a empty string', function () {
      const updateItem = {
        folderId: '',
      };
      let data;

      return Note.findOne({ folderId: { $exists: true }, userId })
        .then((note) => {
          data = note;
          return chai
            .request(app)
            .put(`/api/notes/${note.id}`)
            .set('Authorization', bearerAuth)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt',
            'userId',
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.folderId).to.not.exist;
          expect(res.body.tags).to.deep.equal(data.tags);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should return an error when a tag `id` is not valid ', function () {
      const updateItem = {
        tags: ['NOT-A-VALID-ID'],
      };
      return Note.findOne({ userId })
        .then(data => chai
          .request(app)
          .put(`/api/notes/${data.id}`)
          .set('Authorization', bearerAuth)
          .send(updateItem))
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The `tags` array contains an invalid id');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toJSON, 'transform').throws('FakeError');

      const updateItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
      };
      return Note.findOne({ userId })
        .then(data => chai
          .request(app)
          .put(`/api/notes/${data.id}`)
          .set('Authorization', bearerAuth)
          .send(updateItem))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it("should prevent overwriting another user's notes", function () {
      let fixture;
      return fetchADifferentUser(userId)
        .then(otherUser => Note.findOne({ userId: otherUser.id }))
        .then((note) => {
          fixture = note;
          const update = { title: '<GoT Spoiler>' };
          return chai
            .request(app)
            .put(`/api/notes/${fixture.id}`)
            .set('Authorization', bearerAuth)
            .send(update);
        })
        .then(res => expect(res).to.have.status(404))
        .then(() => Note.findById(fixture.id))
        .then((note) => {
          expect(note.toObject()).to.deep.equal(fixture.toObject());
        });
    });

    it('should prevent transfering a note to another user', function () {
      let otherUser;
      let originalCount;
      return fetchADifferentUser(userId)
        .then((aUser) => {
          otherUser = aUser;
          return Promise.all([
            Note.countDocuments({ userId: otherUser.id }),
            Note.findOne({ userId }),
          ]);
        })
        .then(([count, fixture]) => {
          originalCount = count;
          return chai
            .request(app)
            .put(`/api/notes/${fixture.id}`)
            .set('Authorization', bearerAuth)
            .send(Object.assign({}, fixture.toObject(), { userId: otherUser.id }));
        })
        .then(res => expect(res).to.have.status(403))
        .then(() => Note.countDocuments({ userId: otherUser.id }))
        .then(count => expect(count).to.equal(originalCount));
    });

    it("should return 422 if attempting to use another user's tags", function () {
      let fixture;
      return fetchADifferentUser(userId)
        .then(otherUser => Promise.all([
          Note.findOne({ userId: otherUser.id }),
          Tag.findOne({ userId: otherUser.id }),
        ]))
        .then(([note, tag]) => {
          fixture = note;
          return chai
            .request(app)
            .put(`/api/notes/${fixture.id}`)
            .set('Authorization', bearerAuth)
            .send(Object.assign({}, fixture.toObject(), { tags: [tag.id] }));
        })
        .then(res => expect(res).to.have.status(422))
        .then(() => Note.findById(fixture.id))
        .then((note) => {
          expect(note.toObject()).to.deep.equal(fixture.toObject());
        });
    });

    it("should return 422 if attempting to use another user's folder", function () {
      let fixture;
      return fetchADifferentUser(userId)
        .then(({ id: otherUserId }) => Promise.all([
          Note.findOne({ userId }),
          Folder.findOne({ userId: otherUserId }),
        ]))
        .then(([note, { id: folderId }]) => {
          fixture = note;
          return chai
            .request(app)
            .put(`/api/notes/${fixture.id}`)
            .set('Authorization', bearerAuth)
            .send(Object.assign({}, fixture.toObject(), { folderId }));
        })
        .then(res => expect(res).to.have.status(422))
        .then(() => Note.findById(fixture.id))
        .then(note => expect(note.toObject()).to.deep.equal(fixture.toObject()));
    });
  });

  describe('DELETE /api/notes/:id', function () {
    it('should delete an existing document and respond with 204', function () {
      let data;
      return Note.findOne({ userId })
        .then((_data) => {
          data = _data;
          return chai
            .request(app)
            .delete(`/api/notes/${data.id}`)
            .set('Authorization', bearerAuth);
        })
        .then((res) => {
          expect(res).to.have.status(204);
          return Note.countDocuments({ _id: data.id });
        })
        .then((count) => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai
        .request(app)
        .delete('/api/notes/NOT-A-VALID-ID')
        .set('Authorization', bearerAuth)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      return Note.findOne()
        .then(data => chai
          .request(app)
          .delete(`/api/notes/${data.id}`)
          .set('Authorization', bearerAuth))
        .then((res) => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

    it("should not delete other user's notes", function () {
      let fixture;
      return fetchADifferentUser(userId)
        .then(otherUser => Note.findOne({ userId: otherUser.id }))
        .then((note) => {
          fixture = note;
          return chai
            .request(app)
            .delete(`/api/notes/${fixture.id}`)
            .set('Authorization', bearerAuth);
        })
        .then(() => Note.countDocuments({ _id: fixture.id }))
        .then(count => expect(count).to.equal(1));
    });
  });
});
