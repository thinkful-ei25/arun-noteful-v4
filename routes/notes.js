/* eslint-disable consistent-return */

'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Folder = require('../models/folder');
const Note = require('../models/note');
const Tag = require('../models/tag');
const tokenAuth = require('../auth/tokenAuth');

const router = express.Router();
router.use(tokenAuth);

function validateObjectIds(req, res, next) {
  const { folderId, tags } = req.body;

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is invalid');
    err.status = 400;
    return next(err);
  }

  if (tags && tags.some(tag => !mongoose.Types.ObjectId.isValid(tag))) {
    const err = new Error('The `tags` array contains an invalid id');
    err.status = 400;
    return next(err);
  }

  next();
}

function validateFolderOwnership(req, res, next) {
  const { folderId } = req.body;
  const { id: userId } = req.user;

  if (!folderId) {
    return next();
  }

  Folder.findOne({ _id: folderId, userId }).then((folder) => {
    if (!folder) {
      const err = new Error('The `folderId` does not exist');
      err.status = 422;
      return next(err);
    }

    next();
  });
}

function validateTagOwnership(req, res, next) {
  const { tags } = req.body;
  const { id: userId } = req.user;

  if (!tags) {
    return next();
  }

  Tag.find({ _id: { $in: tags }, userId }).then((results) => {
    const ownedTagIds = results.map(tag => tag.id.toString());
    const badIds = tags.filter(tag => !ownedTagIds.includes(tag));
    if (badIds.length) {
      const err = new Error(
        `The following tag ids don't exist: [${badIds.join(', ')}]`,
      );
      err.status = 422;
      return next(err);
    }

    next();
  });
}

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const { id: userId } = req.user;

  const filter = { userId };

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ title: re }, { content: re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
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

  Note.findOne({ _id: id, userId })
    .populate('tags')
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
router.post(
  '/',
  validateObjectIds,
  validateFolderOwnership,
  validateTagOwnership,
  (req, res, next) => {
    const {
      title, content, folderId, tags,
    } = req.body;
    const { id: userId } = req.user;

    /** *** Never trust users - validate input **** */
    if (!title) {
      const err = new Error('Missing `title` in request body');
      err.status = 400;
      return next(err);
    }


    const newNote = {
      title,
      content,
      folderId,
      tags,
      userId,
    };
    if (newNote.folderId === '') {
      delete newNote.folderId;
    }

    if (req.body.userId && req.body.userId !== userId) {
      const err = new Error('Cannot create a note on behalf of another user');
      err.status = 403;
      return next(err);
    }

    Note.create(newNote)
      .then((result) => {
        res
          .location(`${req.originalUrl}/${result.id}`)
          .status(201)
          .json(result);
      })
      .catch((err) => {
        next(err);
      });
  },
);

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put(
  '/:id',
  validateObjectIds,
  validateFolderOwnership,
  validateTagOwnership,
  (req, res, next) => {
    const { id } = req.params;
    const { id: userId } = req.user;

    const toUpdate = {};
    const updateableFields = ['title', 'content', 'folderId', 'tags', 'userId'];

    updateableFields.forEach((field) => {
      if (field in req.body) {
        toUpdate[field] = req.body[field];
      }
    });

    /** *** Never trust users - validate input **** */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('The `id` is not valid');
      err.status = 400;
      return next(err);
    }

    if (toUpdate.title === '') {
      const err = new Error('Missing `title` in request body');
      err.status = 400;
      return next(err);
    }

    if (toUpdate.userId && toUpdate.userId !== userId) {
      const err = new Error('Cannot transfer note to another user');
      err.status = 403;
      return next(err);
    }

    if (toUpdate.folderId === '') {
      delete toUpdate.folderId;
      toUpdate.$unset = { folderId: 1 };
    }

    Note.findOneAndUpdate({ _id: id, userId }, toUpdate, { new: true })
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
  },
);

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

  Note.findOneAndDelete({ _id: id, userId })
    .then(() => {
      res.sendStatus(204);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
