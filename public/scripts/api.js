/* global $ */
'use strict';

const api = (function () {
  function authHeader() {
    return { Authorization: `Bearer ${store.authToken}` };
  }

  const search = function (path, query) {
    return $.ajax({
      type: 'GET',
      url: path,
      dataType: 'json',
      data: query,
      headers: authHeader(),
    });
  };
  const details = function (path) {
    return $.ajax({
      type: 'GET',
      dataType: 'json',
      url: path,
      headers: authHeader(),
    });
  };
  const update = function (path, obj) {
    return $.ajax({
      type: 'PUT',
      url: path,
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(obj),
      headers: authHeader(),
    });
  };
  const create = function (path, obj) {
    return $.ajax({
      type: 'POST',
      url: path,
      contentType: 'application/json',
      dataType: 'json',
      processData: false,
      data: JSON.stringify(obj),
      headers: authHeader(),
    });
  };
  const remove = function (path) {
    return $.ajax({
      type: 'DELETE',
      dataType: 'json',
      url: path,
      headers: authHeader(),
    });
  };
  return {
    create,
    search,
    details,
    update,
    remove
  };
}());
