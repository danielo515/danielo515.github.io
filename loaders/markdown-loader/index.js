var frontMatter = require('front-matter')
var markdownIt = require('markdown-it')
var hljs = require('highlight.js')
var objectAssign = require('object-assign')

var highlight = function (str, lang) {
  if ((lang !== null) && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(lang, str).value
    } catch (_error) {
      console.error(_error)
    }
  }
  try {
    return hljs.highlightAuto(str).value
  } catch (_error) {
    console.error(_error)
  }
  return ''
}


var md = markdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight,
})
  .use(require('markdown-it-sub'))
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-deflist'))
  .use(require('markdown-it-abbr'))
  .use(require('markdown-it-attrs'))

module.exports = function (content) {
  this.cacheable()
  const sections = [];
  md = md.use(require('markdown-it-anchor'), {level: 1, callback: (token, info) => sections.push(info)})
  const meta = frontMatter(content)
  const body = md.render(meta.body)
  const result = objectAssign({}, meta.attributes, {
    body,
    sections
  })
  this.value = result
  return `module.exports = ${JSON.stringify(result)}`
}
