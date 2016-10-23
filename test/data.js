const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');

var plugin = new Plugin({});

test('data', function (t) {
  t.plan(1);

  return plugin.getTemplateData(path.resolve('test/data/index.hbs')).then(
    function (results) {
      var awaited = {
        files: [path.resolve('test/data/index.json')],
        data: {
          content: 'Lorem ipsum'
        }
      };

      t.same(results, awaited);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

// should not reject, templates without data are perfectly fine
test('missing data', function (t) {
  t.plan(1);

  return plugin.getTemplateData(path.resolve('test/data/missing.hbs')).then(
    function (results) {
      var awaited = {
        files: [],
        data: null
      };

      t.same(results, awaited);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});