var StromboliPlugin = require('stromboli-plugin');
var fs = require('fs-extra');
var path = require('path');

var Promise = require('promise');
var Handlebars = require('handlebars');
var readJSON = Promise.denodeify(fs.readJSON);

class Plugin extends StromboliPlugin {
  /**
   *
   * @param file {String}
   * @param renderResult {StromboliRenderResult}
   * @returns {Promise}
   */
  render(file, renderResult) {
    var that = this;

    return that.readFile(file).then(
      function (readResult) {
        var hbs = Handlebars.create();
        var ast = hbs.parse(readResult);
        var dependencies = that.findPartialDependencies(ast, hbs).add(file);

        dependencies.forEach(function (dependency) {
          renderResult.addDependency(dependency);
        });

        var template = hbs.compile(ast);

        return that.getTemplateData(file).then(
          function (result) {
            result.files.forEach(function(file) {
              renderResult.addDependency(file);
            });

            var binary = template(result.data);

            renderResult.addBinary('index.html', binary);

            return renderResult;
          }
        );
      },
      function (err) {
        return Promise.reject(err);
      }
    );
  }

  getTemplateData(file) {
    var that = this;
    var dataFile = path.join(path.dirname(file), 'demo.json');

    var result = {
      files: [],
      data: null
    };

    return that.exists(dataFile).then(
      function () {
        return readJSON(dataFile).then(
          function (data) {
            result.files.push(dataFile);
            result.data = data;

            return result;
          }
        )
      },
      function () {
        return result;
      }
    );
  }

  findPartialDependencies(nodes, hbs) {
    var results = new Set();

    if (nodes && nodes.body) {
      results = this.recursiveNodeSearch(nodes.body, results, hbs);
    }

    return results;
  };

  recursiveNodeSearch(statements, results, hbs) {
    var that = this;

    statements.forEach(function (statement) {
      if (statement && statement.type && statement.type === 'PartialStatement') {
        var partialName = statement.name.original;
        var partialPath = path.resolve(path.join('src', partialName + '.hbs')); // todo: 'src' is unknown at this point, should be sent by Stromboli at runtime
        var readResult = fs.readFileSync(partialPath).toString();
        var nodes = hbs.parse(readResult);

        hbs.registerPartial(partialName, readResult);

        that.recursiveNodeSearch(nodes.body, results, hbs);

        results.add(partialPath);
      }

      if (statement && statement.program && statement.program.body) {
        that.recursiveNodeSearch(statement.program.body, results, hbs);
      }

      if (statement && statement.inverse && statement.inverse.body) {
        that.recursiveNodeSearch(statement.inverse.body, results, hbs);
      }
    });

    return results;
  }
}

module.exports = Plugin;