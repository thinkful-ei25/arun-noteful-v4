'use strict';

const mongoose = require('mongoose');

const { TEST_MONGODB_URI, MONGODB_OPTIONS } = require('../config');
const {
  folders, notes, tags, users,
} = require('../db/data');
const Folder = require('../models/folder');
const Note = require('../models/note');
const Tag = require('../models/tag');
const User = require('../models/user');

const utils = {
  connectToDatabase() {
    // prettier-ignore
    return mongoose
      .connect(TEST_MONGODB_URI, MONGODB_OPTIONS)
      .then(() => this.cleanDatabase())
      .then(() => Promise.all([
        Note.createIndexes(),
        Tag.createIndexes(),
        Folder.createIndexes(),
        User.createIndexes(),
      ]));
  },

  seedDatabase() {
    return Promise.all([
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Tag.insertMany(tags),
      User.insertMany(users),
    ]);
  },

  cleanDatabase() {
    return Promise.all([
      Note.deleteMany(),
      Folder.deleteMany(),
      Tag.deleteMany(),
      User.deleteMany(),
    ]);
  },

  disconnectFromDatabase() {
    return mongoose.connection.dropDatabase().then(() => mongoose.disconnect());
  },
};

module.exports = utils;
