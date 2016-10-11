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

        return that._parse(hbs, readResult, file).then(
          function (ast) {
            return that.findPartialDependencies(ast, hbs, file).then(
              function (dependencies) {
                dependencies.add(file);

                dependencies.forEach(function (dependency) {
                  renderResult.addDependency(dependency);
                });

                var template = hbs.compile(ast);

                return that.getTemplateData(file).then(
                  function (result) {
                    result.files.forEach(function (file) {
                      renderResult.addDependency(file);
                    });

                    var binary = template(result.data);

                    renderResult.addBinary('index.html', binary);

                    return renderResult;
                  }
                );
              }
            )
          }
        );
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

  findPartialDependencies(nodes, hbs, file) {
    var that = this;
    var results = new Set();

    if (nodes && nodes.body) {
      return that.recursiveNodeSearch(nodes.body, results, hbs, file);
    }
    else {
      return Promise.resolve([]);
    }
  };

  _parse(hbs, data, file) {
    return new Promise(function (fulfill, reject) {
      try {
        var ast = hbs.parse(data);

        fulfill(ast);
      }
      catch (err) {
        var error = {
          file: file,
          message: err
        };

        reject(error);
      }
    });
  };

  recursiveNodeSearch(statements, results, hbs, file) {
    var that = this;

    return Promise.all(statements.map(function (statement) {
      if (statement) {
        if (statement.type && statement.type === 'PartialStatement') {
          var partialName = statement.name.original;
          var partialPath = path.resolve(path.join('src', partialName + '.hbs')); // todo: 'src' is unknown at this point, should be sent by Stromboli at runtime

          return that.readFile(partialPath).then(
            function (readResult) {
              return that._parse(hbs, readResult, partialPath).then(
                function (nodes) {
                  hbs.registerPartial(partialName, readResult);

                  return that.recursiveNodeSearch(nodes.body, results, hbs, partialPath).then(
                    function () {
                      results.add(partialPath);
                    }
                  );
                }
              );
            },
            function (err) {
              var error = {
                file: file,
                message: err.message
              };

              return Promise.reject(error);
            }
          )
        }
        else if (statement.program && statement.program.body) {
          return that.recursiveNodeSearch(statement.program.body, results, hbs, file);
        }
        else if (statement.inverse && statement.inverse.body) {
          return that.recursiveNodeSearch(statement.inverse.body, results, hbs, file);
        }
      }
    })).then(
      function () {
        return results;
      }
    );
  }
}

module.exports = Plugin;