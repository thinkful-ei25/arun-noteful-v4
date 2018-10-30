'use strict';

const express = require('express');
const passport = require('passport');

const { createAuthToken } = require('../auth/tokens');

const router = new express.Router();
const authOptions = { session: false, failWithError: true };

router.post('/login', passport.authenticate('local', authOptions), (req, res) => {
  const authToken = createAuthToken(req.user.toObject());
  res.json({ authToken });
});

module.exports = router;
