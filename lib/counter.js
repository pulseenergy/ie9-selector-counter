/* jshint eqnull:true */
var fs = require('fs');
var path = require('path');
var https = require('https');
var tmp = require('tmp');

// Thanks jshint! :)
/**
 * Removes JavaScript comments from a string by replacing
 * everything between block comments and everything after
 * single-line comments in a non-greedy way.
 *
 * English version of the regex:
 *   match '/*'
 *   then match zero or more instances of any character (incl. \n)
 *   except for instances of '* /' (without a space, obv.)
 *   then match '* /' (again, without a space)
 *
 * @param {string} str a string with potential JavaScript comments.
 * @returns {string} a string without JavaScript comments.
 */
function removeComments(str) {
    str = str || "";

    str = str.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, "");
    str = str.replace(/(^|[^:])\/\/[^\n\r]*/g, "$1"); // Everything after '//' except import URLs

    return str;
}

function importFiles (filePath, file, importCallback) {
    var importStatements = file.match(/(@import)(.+?)(;)/gim, "$2}");
    if (importStatements) {
        var importStatement = importStatements[0];
        var importFilePath = importStatement
            .replace(" ", "")
            .replace(/(@import)(.+?)(;)/gim, "$2")
            .replace(/(url\()(.+?)(\))/gim, "$2")
            .replace(/['"]+/g, '');
        if (importFilePath.match(/:\/\//)) {
            var tmpFilename = tmp.fileSync().name;
            var tmpFile = fs.createWriteStream(tmpFilename);
            var request = https.get(importFilePath, function(response) {
                if (response.statusCode !== 200) {
                    console.log("IE9 Selector Counter unable to import external resource. Selector count may not include all selectors in imported file. Status", response.statusCode, importFilePath);
                    file = file.replace(importStatement, '');
                    importFiles(filePath, file, importCallback);
                } else {
                    response.pipe(tmpFile);
                    tmpFile.on('finish', function() {
                        tmpFile.close(function () {
                            var importedCss = fs.readFileSync(tmpFilename, {encoding: "UTF-8"});
                            file = file.replace(importStatement, importedCss);
                            importFiles(filePath, file, importCallback);
                        });
                    });
                }
            }).on('error', function (err) {
                throw err;
            });
        } else {
            var importedCss = fs.readFileSync(path.resolve(path.dirname(filePath), importFilePath), {encoding: "UTF-8"});
            file = file.replace(importStatement, importedCss);
            importFiles(filePath, file, importCallback);
        }
    } else {
        importCallback(file);
    }
}

var exports = {
    count: function (file, countCallback) {
        var tmp,
            input = fs.readFileSync(file).toString()
                // remove new lines
                .replace(/\n/gim, "")
                // normalize whitespace
                .replace(/\s{2,}/gim, " ")
            ;

        input = removeComments(input)
            // remove media queries, preserving their content
            .replace(/(@media[^{]+\{)(.+?)(\}\s*\})/gim, "$2}")
            // remove the contents of the selectors
            .replace(/\{([^{]+)\}/gim, "{}")

            // pretty printing for debugging
            // .replace(/\{\}/gim, "{}\n")
            // .replace(/,/gim, ",\n")
            // .replace(/\n{2,}/gim, "\n")
            ;
        importFiles(file, input, function (inputWithImports) {
            if (!inputWithImports.match(/\{/gim)) {
                countCallback(0);
                return;
            }
            var count = inputWithImports.match(/\{/gim).length +
                ((tmp = inputWithImports.match(/,/gim)) == null ? 0 : tmp.length) -
                ((tmp = inputWithImports.match(/::-(webkit|moz|o)[^,{]*?/gim)) == null ? 0 : tmp.length);
            countCallback(count);
        });
    }
};

module.exports = exports;
