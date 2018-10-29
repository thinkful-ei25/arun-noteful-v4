'use strict';

const express = require('express');

const User = require('../models/user');

const router = new express.Router();

function validateNewUser(req, res, next) {
  const { username, password } = req.body;

  let err;
  if (!username) {
    err = new Error('Missing `username` field');
    err.status = 400;
  } else if (!password) {
    err = new Error('Missing `password` field');
    err.status = 400;
  } else if (username.length < 1) {
    err = new Error('`username` must have a minimum length of 1');
    err.status = 422;
  } else if (password.length < 8 || password.length > 72) {
    err = new Error('`password` must be between 8 and 72 characters long');
    err.status = 422;
  } else if (username.trim() !== username || password.trim() !== password) {
    err = new Error(
      'usernames and passwords must not have leading/trailing whitespace',
    );
    err.status = 422;
  }

  if (err) {
    next(err);
    return;
  }

  next();
}

router.post('/', validateNewUser, (req, res, next) => {
  const { username, password, fullname } = req.body;

  User.hashPassword(password)
    .then(digest => User.create({ username, fullname, password: digest }))
    .then((result) => {
      res
        .status(201)
        .location(`${req.baseUrl}/${result._id}`)
        .json(result);
    })
    .catch((err) => {
      if (err.code === 11000 && err.name === 'MongoError') {
        const returnable = new Error('The username already exists');
        returnable.status = 400;
        return Promise.reject(returnable);
      }
      return Promise.reject(err);
    })
    .catch(next);
});

module.exports = router;
