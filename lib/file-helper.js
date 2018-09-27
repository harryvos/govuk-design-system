'use strict'

const paths = require('../config/paths.json')

const fs = require('fs')
const path = require('path')
const nunjucks = require('nunjucks')
const matter = require('gray-matter')

const beautify = require('js-beautify').html
const decamelize = require('decamelize')

nunjucks.configure(paths.layouts)

// This helper function takes a path of a file and
// returns the contents as string
exports.getFileContents = path => {
  let fileContents
  try {
    fileContents = fs.readFileSync(path)
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(err.message)
    } else {
      throw err
    }
  }
  return fileContents.toString()
}

// This helper function takes a path of a *.md.njk file and
// returns the Nunjucks syntax inside that file without markdown data and imports
exports.getNunjucksCode = path => {
  let fileContents = this.getFileContents(path)

  let parsedFile = matter(fileContents)

  // Omit any `{% extends "foo.njk" %}` nunjucks code, because we extend
  // templates that only exist within the Design System – it's not useful to
  // include this in the code we expect others to copy.
  let content = parsedFile.content.replace(
    /{%\s*extends\s*\S*\s*%}\s+/,
    ''
  )

  return content
}

// This helper function takes a path of a macro arguments file and
// returns the arguments data

exports.getMacroOptions = componentName => {

  if (componentName == "text-input"){
    // workaround while there's an inconsistency in the naming
    componentName = "input"
  }

  console.log()
  console.log(componentName)

  let macroOptions = []

  try {
    macroOptions = require(__dirname + "/../macro-options-tmp/" + componentName + "/macro-options.json").params
  } catch (err){}

  let processedOptions = []

  let processOptions = (groupName, options) => {
    let group = {
      "groupName": groupName,
      "options": []
    }

    processedOptions.push(group)

    for (let option of options){
      // make a copy otherwise if the app reloads we work on a cached copy and
      // keep adding links on the end
      option = Object.assign({}, option)

      if (option.required === true){
        option.description = "<strong>Required.</strong> " + option.description
      }

      if (option.isComponent && (option.name == "hint" || option.name == "label")){
        // these components are hidden in the Design System, so display their options
        let otherComponent = require(__dirname + "/../macro-options-tmp/" + option.name + "/macro-options.json")
        option.params = otherComponent.params

      } else if (option.isComponent){
        let otherComponentPath = "/components/" + decamelize(option.name, '-')
        option.description += ` See <a href="${otherComponentPath}">${option.name}</a>.`
      }

      if (option.params){
        option.description += ` See <a href="#nunjucks-macro-options-${option.name}">${option.name}</a>.`
        processOptions(option.name, option.params)
      }
      group.options.push(option)
    }
  }

  processOptions("", macroOptions)

  console.log(JSON.stringify(processedOptions, null, '  '))

  return processedOptions

}

// This helper function takes a path of a *.md.njk file and
// returns the frontmatter as an object
exports.getFrontmatter = path => {
  let fileContents = this.getFileContents(path)

  let parsedFile = matter(fileContents)
  return parsedFile.data
}

// Get 'fingerprinted' version of a given asset file.
exports.getFingerprint = function (file) {
  // Grab fingerprint array from the template context
  const filePath = this.lookup('path')
  const fingerprints = this.lookup('fingerprint')

  // If that fails, and we know the path of the current file, look for a
  // fingerprinted asset relative to the current file (e.g. `../foo.css`)
  //
  // We only know the path of the current file when we're compiling the layout –
  // calls to this function with a relative path will fail if made from the
  // source files themselves.
  if (filePath) {
    const relativeFile = path.join(filePath, file)

    if (fingerprints.hasOwnProperty(relativeFile)) {
      return '/' + fingerprints[relativeFile]
    }
  }

  // Look for a fingerprinted asset at this path relative to the site root
  if (fingerprints.hasOwnProperty(file)) {
    return '/' + fingerprints[file]
  }

  // The thrown error will stop the build, but not provide any useful output,
  // so we have to console.log as well.
  console.log(`Could not find fingerprint for file ${file}`)
  throw new Error(`Could not find fingerprint for file ${file}`)
}

// This helper function takes a path of a *.md.njk file and
// returns the HTML rendered by Nunjucks without markdown data
exports.getHTMLCode = path => {
  let fileContents = this.getFileContents(path)

  let parsedFile = matter(fileContents)
  let content = parsedFile.content

  let html
  try {
    html = nunjucks.renderString(content)
  } catch (err) {
    if (err) {
      console.log('Could not get HTML code from ' + path)
    }
  }

  return beautify(html.trim(), {
    indent_size: 2,
    end_with_newline: true,
    // If there are multiple blank lines, reduce down to one blank new line.
    max_preserve_newlines: 1,
    // set unformatted to a small group of elements, not all inline (the default)
    // otherwise tags like label arent indented properly
    unformatted: ['code', 'pre', 'em', 'strong']
  })
}

// This helper function takes a path and
// returns the directories found under that path
exports.getDirectories = itemPath => {
  let files
  let directories
  try {
    files = fs.readdirSync(itemPath)
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(err.message)
    } else {
      throw err
    }
  }
  if (files) {
    directories = files.filter(filePath => fs.statSync(path.join(itemPath, filePath)).isDirectory())
  }
  return directories
}
