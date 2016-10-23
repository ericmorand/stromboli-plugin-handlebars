const Plugin = require('../src/plugin');
const RenderResult = require('../node_modules/stromboli/lib/render-result.js');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

var plugin = new Plugin({});

test('render without data', function (t) {
  t.plan(3);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/basic/index.hbs'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 2);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
      var awaited = '<div class="outer"><div class="inner"></div></div>';

      t.equal(render, awaited);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with data', function (t) {
  t.plan(3);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/data/index.hbs'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 2);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
      var awaited = '<div class="outer">Lorem ipsum</div>';

      t.same(render, awaited);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with error', function (t) {
  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/error/index.hbs'), renderResult).then(
    function(renderResult) {
      t.fail();
    },
    function(err) {
      t.pass(err);
    }
  );
});