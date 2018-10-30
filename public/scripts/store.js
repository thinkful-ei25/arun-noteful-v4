'use strict';

const store = (function() {
  return {
    notes: [],
    folders: [],
    tags: [],
    currentNote: {},
    currentQuery: {
      searchTerm: '',
    },
    currentUser: {},
    authToken: '',
  };
})();
