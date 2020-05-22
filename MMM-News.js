Module.register("MMM-News", {
  defaults: {
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
    autoScroll: false, // some site will not be displayed as normal when this is set as true. but normally, we have no interface to control the scroll of MM. Choice is yours.
    scrollStep: 100,
    scrollInterval: 1000,
    touchable: false,
    detailTimeout : 1000*20, //hide detail when this time passed after last action. `0` : never be timed out.
    readabilityExcepts: [],

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
        this.notificationReceived("NEWS_DETAIL")
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
        this.prepareDetail()
        this.sendSocketNotification("START")
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
      case "NEWS_DETAIL":
        var url = document.getElementById("NEWS").dataset.url
        if (this.config.scrollDown == 0) {
          this.displayDetail(url)
        } else {
          this.sendSocketNotification("REQUEST_NEWS_DETAIL", url)
        }
        break
      case "NEWS_DETAIL_CLOSE":
        this.closeDetail()
        break
      case "NEWS_DETAIL_SCROLLUP":
        this.scrollUpDetail()
        break
      case "NEWS_DETAIL_SCROLLDOWN":
        this.scrollDownDetail()
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
    if (noti == "READY_DETAIL") {
      this.displayDetail(payload)
    }
  },

  displayDetail: function(url) {
    var iframe = document.getElementById("NEWS_DETAIL_IFRAME")
    iframe.src = url
    if (this.config.autoScroll) {
      var interval = this.config.scrollInterval
      iframe.onload = () => this.autoScrollDown()
    }
    var detail = document.getElementById("NEWS_DETAIL")
    detail.style.display = "block"
    detail.resetTimer(this.config.detailTimeout)
  },

  prepareDetail: function() {
    var detail = document.createElement("div")
    if (this.config.touchable == false) {
      detail.classList.add("untouchable")
    }
    detail.id = "NEWS_DETAIL"
    detail.style.display = "none"
    detail.timer = null
    detail.resetTimer = (interval) => {
      clearTimeout(detail.timer)
      detail.timer = null
      if (interval > 0) {
        detail.timer = setTimeout(()=>{
          this.closeDetail()
        }, interval)
      }
    }
    detail.closeMyself = () => {
      detail.style.display = "none"
    }

    var iframe = document.createElement("iframe")
    iframe.id = "NEWS_DETAIL_IFRAME"
    iframe.dataset.yPos = 0

    var cover = document.createElement("div")
    cover.id = "NEWS_DETAIL_COVER"
    var close = document.createElement("div")
    close.id = "NEWS_DETAIL_CLOSE"
    close.innerHTML = "X"
    close.className = "touchable"
    close.onclick = () => {
      this.notificationReceived("NEWS_DETAIL_CLOSE")
    }
    var scroll = document.createElement("div")
    scroll.id = "NEWS_DETAIL_SCROLL"
    var up = document.createElement("div")
    up.id = "NEWS_DETAIL_SCROLLUP"
    up.innerHTML = "▲"
    up.className = "touchable"
    up.onclick = () => {
      this.notificationReceived("NEWS_DETAIL_SCROLLUP")
    }
    var down = document.createElement("div")
    down.id = "NEWS_DETAIL_SCROLLDOWN"
    down.innerHTML = "▼"
    down.className = "touchable"
    down.onclick = () => {
      this.notificationReceived("NEWS_DETAIL_SCROLLDOWN")
    }
    scroll.appendChild(up)
    scroll.appendChild(down)
    cover.appendChild(close)
    cover.appendChild(scroll)
    detail.appendChild(iframe)
    detail.appendChild(cover)
    document.getElementsByTagName('body')[0].appendChild(detail)
  },

  closeDetail: function() {
    var detail = document.getElementById("NEWS_DETAIL")
    detail.closeMyself()
    var iframe = document.getElementById("NEWS_DETAIL_IFRAME")
    iframe.dataset.yPos = 0
    iframe.src= "about:blank"
  },

  scrollUpDetail: function() {
    var detail = document.getElementById("NEWS_DETAIL")
    detail.resetTimer(this.config.detailTimeout)
    var iframe = document.getElementById("NEWS_DETAIL_IFRAME")
    var w = iframe.contentWindow
    var d = w.document.getElementsByTagName('body')[0]
    var cy = parseInt(iframe.dataset.yPos)
    var ty = cy - this.config.scrollStep
    if (ty < 0) {
      ty = 0
    } else {
      ty = cy - this.config.scrollStep
    }
    w.scrollTo(0, ty)
    iframe.dataset.yPos = ty
    return ty
  },

  scrollDownDetail: function() {
    var detail = document.getElementById("NEWS_DETAIL")
    detail.resetTimer(this.config.detailTimeout)
    var iframe = document.getElementById("NEWS_DETAIL_IFRAME")
    var w = iframe.contentWindow
    var d = w.document.getElementsByTagName('body')[0]
    var my = d.scrollHeight
    var cy = parseInt(iframe.dataset.yPos)
    var ty = cy + this.config.scrollStep
    if (ty > my) {
      ty = my
    } else {
      ty = cy + this.config.scrollStep
    }
    w.scrollTo(0, ty)
    iframe.dataset.yPos = ty
    return ty
  },

  autoScrollDown: function() {
    var iframe = document.getElementById("NEWS_DETAIL_IFRAME")
    var w = iframe.contentWindow
    var d = w.document.getElementsByTagName('body')[0]
    var my = d.scrollHeight
    var cy = this.scrollDownDetail()
    if (cy < my) {
      setTimeout(()=>{
        this.autoScrollDown()
      }, this.config.scrollInterval)
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
        args_pattern: ["o|n|p|c|u|d"],
        callback: 'telegramNews',
        description: "See the github page. https://github.com/bugsounet/MMM-News"
      }
    ]
  },

  telegramNews: function(command, handler) {
    var c = (handler.args) ? handler.args[0] : "b"
    console.log(handler.args, c)
    switch (c) {
      case "o":
        this.notificationReceived("NEWS_DETAIL")
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
      case "c":
        this.notificationReceived("NEWS_DETAIL_CLOSE")
        handler.reply("TEXT", "Detail iframe will be closed.")
        break
      case "u":
        this.notificationReceived("NEWS_DETAIL_SCROLLUP")
        handler.reply("TEXT", "It will be scrolled up.")
        break
      case "d":
        this.notificationReceived("NEWS_DETAIL_SCROLLDOWN")
        handler.reply("TEXT", "It will be scrolled down.")
        break
      default:
        handler.reply("TEXT", "I cannot understand. Sorry.")
        break
    }
  }
})
