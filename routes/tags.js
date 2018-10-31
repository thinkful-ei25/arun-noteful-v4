/* eslint-disable consistent-return, no-param-reassign */

'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Tag = require('../models/tag');
const Note = require('../models/note');
const tokenAuth = require('../auth/tokenAuth');

const router = express.Router();
router.use(tokenAuth);

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { id: userId } = req.user;

  Tag.find({ userId })
    .sort('name')
    .then((results) => {
      res.json(results);
    })
    .catch((err) => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  /** *** Never trust users - validate input **** */
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Tag.find({ _id: id, userId })
    .then((result) => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch((err) => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { name } = req.body;
  const { id: userId } = req.user;

  const newTag = { name, userId };

  /** *** Never trust users - validate input **** */
  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  Tag.create(newTag)
    .then((result) => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch((err) => {
      if (err.code === 11000) {
        err = new Error('Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const { id: userId } = req.user;

  /** *** Never trust users - validate input **** */
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  if (userId !== req.body.userId) {
    const err = new Error('Cannot transfer a tag to a different user');
    err.status = 403;
    return next(err);
  }

  const updateTag = { name, userId };

  Tag.findByIdAndUpdate({ _id: id, userId }, updateTag, { new: true })
    .then((result) => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch((err) => {
      if (err.code === 11000) {
        err = new Error('Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  /** *** Never trust users - validate input **** */
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Tag.findOneAndDelete({ _id: id, userId })
    .then((deleted) => {
      if (!deleted) {
        return;
      }

      return Note.updateMany({ tags: id }, { $pull: { tags: id } });
    })
    .then(() => res.sendStatus(204))
    .catch(next);
});

module.exports = router;
