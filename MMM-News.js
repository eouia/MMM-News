Module.register("MMM-News", {
  defaults: {
    debug: false,
    apiKey : "", // set your newsapi.org API Key
    type: "horizontal", // "horizontal", "vertical" You can make your own type with CSS class selector.

    // See https://newsapi.org/sources for available query options('sources' or `country`, `category`).
    query : [
      {
        sources: "abc-news, bloomberg, cnn",
        // A comma-seperated string of identifiers for the news sources or blogs you want headlines from.
        // Too many `sources` at once could make API error. If you want, split them to several queries.
        // `sources` are not able to be mixed with `country` and `category`.
        q : "Donald Trump", // Keywords or a phrase to search for. `null`, "", or omitted will get all headlines.
      },
      {
        country: "de",
      },
      {
        country: "gb", // country : The 2-letter ISO 3166-1 code of the country, "" or `null` for all of the world.
        category: "sports", // category : The category you want to get headlines for.
        // Possible options: `business` `entertainment` `general` `health` `science` `sports` `technology`
        q : "Manchester United"
      }
    ],
    items: 20, // number of how many headlines to get from each query. max 100
    timeFormat: "relative", // Or You can use "YYYY-MM-DD HH:mm:ss" format.
    drawInterval: 1000*30, // How long time each article will be shown.
    touchable: false,
    templateFile: "template.html"
  },

  getStyles: function() {
    return ["MMM-News.css"]
  },

  start: function() {
    this.sendSocketNotification("INIT", this.config)
    this.articles = []
    this.firstUpdate = 0
    this.timer = null
    this.index = 0
    this.template = ""
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    wrapper.id = "NEWS"
    wrapper.className = this.config.type
    var newsContent = document.createElement("div")
    newsContent.id = "NEWS_CONTENT"
    wrapper.appendChild(newsContent)
    if (this.config.touchable == false) {
      wrapper.classList.add("untouchable")
    } else {
      wrapper.onclick = (event)=> {
        event.stopPropagation()
        this.openNews()
      }
      var newsTouch = document.createElement("div")
      newsTouch.id = "NEWS_TOUCH"
      newsTouch.style.display = "none"
      var newsTouchPrevious = document.createElement("div")
      newsTouchPrevious.id = "NEWS_TOUCH_PREVIOUS"
      newsTouchPrevious.className = "touchable"
      newsTouchPrevious.innerHTML = "◀"
      newsTouchPrevious.onclick = (event) => {
        event.stopPropagation()
        this.notificationReceived("NEWS_PREVIOUS")
      }
      var newsTouchNext = document.createElement("div")
      newsTouchNext.id = "NEWS_TOUCH_NEXT"
      newsTouchNext.className = "touchable"
      newsTouchNext.innerHTML = "▶"
      newsTouchNext.onclick = (event)=> {
        event.stopPropagation()
        this.notificationReceived("NEWS_NEXT")
      }
      newsTouch.appendChild(newsTouchPrevious)
      newsTouch.appendChild(newsTouchNext)
      wrapper.appendChild(newsTouch)
    }
    return wrapper
  },

  notificationReceived: function(noti, payload) {
    switch (noti) {
      case "DOM_OBJECTS_CREATED":
        this.readTemplate()
        this.sendSocketNotification("START")
        break
      case "NEWS_DETAIL":
        this.openNews()
        break
      case "NEWS_PREVIOUS":
        if (this.index > 0) {
          this.index--
        } else {
          this.index = this.articles.length - 1
        }
        this.draw()
        break
      case "NEWS_NEXT":
        if (this.index < this.articles.length - 1) {
          this.index++
        } else {
          this.index = 0
        }
        this.draw()
        break
    }
  },

  socketNotificationReceived: function(noti, payload) {
    if (noti == "UPDATE") {
      if (payload.length > 0) {
        this.articles = payload
        if (this.firstUpdate == 0) {
          this.firstUpdate = 1
          this.index = 0
          this.draw()
        }
      }
    }
  },

  readTemplate: function() {
    var file = this.config.templateFile
    var url = "modules/MMM-News/" + file
    var xmlHttp = new XMLHttpRequest()
    xmlHttp.onreadystatechange = () => {
      var res = []
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        this.template = xmlHttp.responseText
      } else if (xmlHttp.status !== 200 && xmlHttp.readyState !== 1) {
        console.log("[NEWS] Template File - ", url , "seems to have some problem.", "("+xmlHttp.statusText+")")
      }
    }
    xmlHttp.open("GET", url, true)
    xmlHttp.send()
  },

  draw: function() {
    clearTimeout(this.timer)
    this.timer = null
    const tag = [
      "sourceId", "author", "content", "description", "articleId",
      "sourceName", "title", "url", "urlToImage", "publishedAt"
    ]
    var article = this.articles[this.index]
    var template = this.template

    for (i in tag) {
      var t = tag[i]
      var tu = "%" + t.toUpperCase() + "%"
      template = template.replace(tu, article[t])
    }
    var imgtag
      = (article.urlToImage)
      ? `<img class="articleImage" src="` + article.urlToImage+ `"/>`
      : ""
    template = template.replace("%ARTICLEIMAGE%", imgtag)
    var className = (article.query.className) ? article.query.className : ""
    template = template.replace("%CLASSNAME%", className)

    var news = document.getElementById("NEWS")

    var newsContent = document.getElementById("NEWS_CONTENT")
    news.classList.add("hideArticle")
    news.classList.remove("showArticle")
    for (j in article) {
      news.dataset[j] = article[j]
    }

    setTimeout(()=>{
      newsContent.innerHTML = ""
      news.classList.remove("hideArticle")
      news.classList.add("showArticle")
      if (this.config.touchable) {
        var newsTouch = document.getElementById("NEWS_TOUCH")
        newsTouch.style.display = "block"
      }
      newsContent.innerHTML = template
    }, 900)

    this.timer = setTimeout(()=>{
      this.index++
      if (this.index >= this.articles.length) {
        this.index = 0
      }
      this.draw()
    }, this.config.drawInterval)
  },

  /** TelegramBot **/
  getCommands: function(commander) {
    return [
      {
        command: 'news',
        args_pattern: ["o|n|p"],
        callback: 'telegramNews',
        description: "See the github page. https://github.com/bugsounet/MMM-News"
      }
    ]
  },

  telegramNews: function(command, handler) {
    var c = (handler.args) ? handler.args[0] : "b"
    switch (c) {
      case "o":
        this.openNews()
        handler.reply("TEXT", "Detail iframe will be shown.")
        break
      case "b":
        var url = document.getElementById("NEWS").dataset.url
        var title = document.getElementById("NEWS").dataset.title
        var message = "[" + title + "](" + url + ")"
        handler.reply("TEXT", message, {parse_mode:"Markdown"})
        break
      case "n":
        this.notificationReceived("NEWS_NEXT")
        handler.reply("TEXT", "Next topic will be shown.")
        break
      case "p":
        this.notificationReceived("NEWS_PREVIOUS")
        handler.reply("TEXT", "Previous topic will be shown.")
        break
      default:
        handler.reply("TEXT", "I cannot understand. Sorry.")
        break
    }
  },

/** A2D **/

  openNews: function () {
    var url = document.getElementById("NEWS").dataset.url
    var title = document.getElementById("NEWS").dataset.title
    if (url) {
      var responseEmulate = {
        "photos": [],
        "urls": [],
        "transcription": {},
        "trysay": null,
        "help": null
      }
      responseEmulate.urls[0] = url
      responseEmulate.transcription.done = true
      responseEmulate.transcription.transcription = "~News~ " + title
      this.sendNotification("A2D", responseEmulate)
    }
  },
})
