'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const serializationOption = {
  virtuals: true,
  transform(doc, result) {
    delete result._id;
    delete result.__v;
    delete result.password;
  },
};

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullname: String,
  },
  {
    toJSON: serializationOption,
    toObject: serializationOption,
  },
);

userSchema.statics.hashPassword = function userHashPassword(password) {
  return bcrypt.hash(password, 10);
};

userSchema.methods.validatePassword = function userValidPassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
