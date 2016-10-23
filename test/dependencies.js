const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');

var plugin = new Plugin({});

test('dependencies', function (t) {
  t.plan(1);

  return plugin.getDependencies(path.resolve('test/dependencies/valid/index.hbs')).then(
    function (results) {
      t.equal(results.size, 4);
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('missing dependencies', function (t) {
  t.plan(1);

  return plugin.getDependencies(path.resolve('test/dependencies/missing/index.hbs')).then(
    function (results) {
      t.equal(results.size, 2);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

test('circular dependencies', function (t) {
  t.plan(1);

  return plugin.getDependencies(path.resolve('test/dependencies/circular/index.hbs')).then(
    function (results) {
      t.equal(results.size, 2);
    },
    function (err) {
      t.fail(err);
    }
  );
});