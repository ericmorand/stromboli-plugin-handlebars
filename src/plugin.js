const fs = require('fs-extra');
const path = require('path');

const Promise = require('promise');
const fsReadJSON = Promise.denodeify(fs.readJSON);
const fsStat = Promise.denodeify(fs.stat);
const fsReadFile = Promise.denodeify(fs.readFile);

class Plugin {
  /**
   *
   * @param config {Object}
   */
  constructor(config) {
    this.config = config;
    this.handlebars = require('handlebars').create();

    /**
     *
     * @param path {String}
     * @returns {Promise}
     */
    this._exists = function (path) {
      return fsStat(path).then(
        function () {
          return path;
        },
        function (e) {
          return Promise.reject(e);
        }
      )
    };

    this._parse = function (hbs, data, file) {
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

    this._recursiveNodeSearch = function (statements, results, hbs, file) {
      var that = this;

      return Promise.all(statements.map(function (statement) {
        if (statement) {
          if (statement.type && statement.type === 'PartialStatement') {
            var partialName = statement.name.original;
            var partialPath = path.resolve(path.join(partialName + '.hbs'));

            if (!results.has(partialPath)) {
              return fsReadFile(partialPath).then(
                function (readResult) {
                  results.add(partialPath);

                  readResult = readResult.toString();

                  return that._parse(hbs, readResult, partialPath).then(
                    function (nodes) {
                      hbs.registerPartial(partialName, readResult);

                      return that._recursiveNodeSearch(nodes.body, results, hbs, partialPath);
                    }
                  );
                },
                function (err) {
                  // dependency doesn't exist, we don't care
                }
              )
            }
            else {
              return Promise.resolve();
            }
          }
        }
      })).then(
        function () {
          return results;
        }
      );
    }
  }

  /**
   *
   * @param file {String}
   * @param renderResult {StromboliRenderResult}
   * @returns {Promise}
   */
  render(file, renderResult) {
    var that = this;

    return that.getDependencies(file).then(
      function (dependencies) {
        dependencies.forEach(function (dependency) {
          renderResult.addDependency(dependency);
        });

        return fsReadFile(file).then(
          function (readResult) {
            var hbs = that.handlebars;

            return that._parse(hbs, readResult.toString(), file).then(
              function (ast) {
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
                )
              }
            )
          }
        )
      }
    );
  }

  getTemplateData(file) {
    var that = this;
    var extension = path.extname(file);
    var dataFile = path.join(path.dirname(file), path.basename(file, extension) + '.json');

    var result = {
      files: [],
      data: null
    };

    return that._exists(dataFile).then(
      function () {
        return fsReadJSON(dataFile).then(
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

  getDependencies(file) {
    var that = this;
    var hbs = that.handlebars;

    return fsReadFile(file).then(
      function (readResult) {
        return that._parse(hbs, readResult.toString(), file).then(
          function (nodes) {
            var results = new Set();

            return that._recursiveNodeSearch(nodes.body, results, hbs, file).then(
              function (results) {
                results.add(file);

                return results;
              }
            );
          }
        );
      }
    );
  };
}

module.exports = Plugin;