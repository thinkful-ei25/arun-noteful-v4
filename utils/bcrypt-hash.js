/* eslint-disable no-console */

'use strict';

const bcrypt = require('bcryptjs');

bcrypt.hash(process.argv[2], 10)
  .then(s => process.stdout.write(s))
  .catch(console.err);
