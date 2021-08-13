const request = require("request")
const moment = require("moment")
const querystring = require("querystring")

var NodeHelper = require("node_helper")

String.prototype.hashCode = function() {
  var hash = 0
  if (this.length == 0) return hash
  for (var i = 0; i < this.length; i++) {
    var char = this.charCodeAt(i)
    hash = ((hash<<5)-hash)+char
    hash = hash & hash
  }
  return hash
}

function slugify(string) {
  const a = 'àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;'
  const b = 'aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------'
  const p = new RegExp(a.split('').join('|'), 'g')
  return string.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(p, c => b.charAt(a.indexOf(c)))
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
}

module.exports = NodeHelper.create({
  start: function() {
    this.config = null
    this.pool = []
    this.queryItems = 0
    this.articles = []
    this.endpoint =  "https://newsapi.org/v2/top-headlines?"
  },

  initializeQuery: function() {
    var query = this.config.query
    console.log("[NEWS] MMM-News Version:",  require('./package.json').version)
    console.error("[NEWS] WARNING")
    console.error("[NEWS] MMM-News search a new owner !")
    console.error("[NEWS] Contact @bugsounet in forum -- http://forum.bugsounet.fr --")
    console.error("[NEWS] MMM-News is now in end of life !")
    for (i in query) {
      var q = query[i]
      var qs = {}
      if (q.hasOwnProperty("sources")) {
        var t = q["sources"].replace(/\s/g, "")
        qs = Object.assign({}, qs, {"sources":t})
      } else {
        if (q.hasOwnProperty("country")) qs = Object.assign({}, qs, {"country":q["country"]})
        if (q.hasOwnProperty("category")) qs = Object.assign({}, qs, {"category":q["category"]})
      }
      if (q.hasOwnProperty("q")) qs = Object.assign({}, qs, {"q":q["q"]})
      qs = Object.assign({}, qs, {"pageSize":this.config.items})
      qs = Object.assign({}, qs, {"apiKey":this.config.apiKey})
      var qp = querystring.stringify(qs)
      this.pool.push({"url":this.endpoint + qp, "query":q})
    }
    console.log("[NEWS] Initialized with", this.pool.length, "query")
  },

  startPooling: function() {
    var count = this.pool.length
    var cb = function(result, config, query) {
      var ret = []
      for (j in result.articles) {
        var article = result.articles[j]
        var time = moment(article.publishedAt)
        if (config.timeFormat == "relative") article.publishedAt = time.fromNow()
        else article.publishedAt = time.format(config.timeFormat)

        article._publishedAt = time.format("X")

        var hashId = "X" + article.url.hashCode()
        article.articleId = hashId
        if (article.source.id) article.sourceId = article.source.id
        else article.sourceId = slugify(article.source.name)

        article.sourceName = article.source.name

        if (!article.content) article.content = ""

        if (!article.description) article.description = article.content

        article.query = query
        ret.push(article)
      }
      return ret
    }

    var getRequest = function(url, query, cfg) {
      return new Promise((resolve, reject)=>{
        request(url, (error, response, body)=> {
          if (error) {
            var e = ""
            reject(e)
          } else {
            var result = JSON.parse(body)
            if (result.status == "error") {
              var e = "result.code" + ":" + result.message
              reject(e)
            } else {
              resolve(result)
            }
          }
        })
      })
    }

    var getArticles = async (url, query, cfg) => {
      try {
        var ret = await getRequest(url, query, cfg)
        var result = cb (ret, cfg, query)
        if (result.length > 0) this.articles = this.articles.concat(result)
        count--
        if (count <= 0) {
          count = this.pool.length
          this.finishPooling()
          return true
        }
        return false
      } catch (error) {
        console.log ("[NEWS] Error : ", url, error)
        return false
      }
    }

    var url = ""
    var query = null
    this.articles = []
    for (i in this.pool) {
      var req = this.pool[i]
      url = req.url
      query = req.query
      getArticles(url, query, this.config, this.articles)
    }
    var timer = setTimeout(()=>{
      this.startPooling()
    }, this.config.scanInterval)
  },

  finishPooling: function() {
    this.articles.sort((a, b)=>{
      return (b._publishedAt - a._publishedAt)
    })
    if (this.config.debug) console.log("[NEWS] Articles are aggregated : ", this.articles.length)
    this.sendSocketNotification("UPDATE", this.articles)
  }
})
