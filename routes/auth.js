'use strict';

const express = require('express');
const passport = require('passport');

const router = new express.Router();
const authOptions = { session: false, failWithError: true };

router.post('/login', passport.authenticate('local', authOptions), (req, res) => {
  res.json(req.user);
});

module.exports = router;
