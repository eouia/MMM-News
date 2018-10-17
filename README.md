# MMM-News
MagicMirror module - displaying news articles with News.org API V2

## Screenshot

## Features
- Aggregate headlines from multiple sources at once.
- Country specific, Category specific, Keyword specific news could be aggregated.
- Touchable (Clickable) UI supported
- Can open article page in iFrame and scrollable by touch or autoScroll
- Controllable by notification
- Controllable by MMM-TelegramBot
- Customizable with Template

## Installation
```javascript
cd ~/MagicMirror/modules/
git clone https://github.com/eouia/MMM-News
```

## Get `newsapi.org` API Key
https://newsapi.org/

## Configuration
### Simple
```javascript
{
  module: "MMM-News",
  position: "bottom_bar",
  config: {
    apiKey : "YOUR NEWSAPI.ORG API KEY",
    type: "horizontal",
    query : [
      {
        sources: "abc-news, cnn, bild",
      },
      {
        country: "de",
        className: "redTitle",
      },
      {
        country: "gb",
        category: "sports",
        q : "Manchester United"
      }
    ],
  }
},
```

### Defaults and Details
```javascript
{
  module: "MMM-News",
  position: "bottom_bar",
  config: {
    apiKey : "", // set your newsapi.org API Key
    type: "horizontal", // "horizontal", "vertical" You can make your own type with CSS class selector.

    // See https://newsapi.org/sources for available query options('sources' or `country`, `category`).
    query : [
      {
        sources: "abc-news, bloomberg, cnn",
        // A comma-seperated string of identifiers for the news sources or blogs you want headlines from.
        // Too many `sources` at once could make API error. If you want, split them to several queries.
        // `sources` are not able to be mixed with `country` and `category`.
      },
      {
        country: "de",
        className: "redTitle", // You can give your CSS className for these articles.
      },
      {
        country: "gb", // country : The 2-letter ISO 3166-1 code of the country, "" or `null` for all of the world.
        category: "sports", // category : The category you want to get headlines for.
        // Possible options: `business` `entertainment` `general` `health` `science` `sports` `technology`
        q : "Manchester United", // Keywords or a phrase to search for. `null`, "", or omitted will get all headlines.
      }
    ],
    items: 20, // number of how many headlines to get from each query. max 100
    timeFormat: "relative", // Or You can use "YYYY-MM-DD HH:mm:ss" format.
    drawInterval: 1000*30, // How long time each article will be shown.
    autoScroll: false, // some site will not be displayed as normal when this is set as true. but normally, we have no interface to control the scroll of MM. Choice is yours.
    scrollStep: 100,
    scrollInterval: 1000,
    touchable: true, // When you have a touchable or clickable interface on your MM.
    detailTimeout : 1000*20, //Hide detail when this time passed after last action. `0` : never be timed out.
    telegramBotOrderOpenDetail : false, //When you use telegramBot, you might not need open detail iFrame on Mirror, because you can get detail link on Telegram.

    // You might not need modify belows;
    endpoint :  "https://newsapi.org/v2/top-headlines",
    scanInterval: 1000*60*10, // This will be automatically recalculated by number of queries to avoid query quota limit. This could be minimum interval.
    templateFile: "template.html",
    notifications: {
      previousArticle : "NEWS_PREVIOUS",
      nextArticle : "NEWS_NEXT",
      showDetail : "NEWS_DETAIL",
      closeDetail : "NEWS_DETAIL_CLOSE",
      scrollDownDetail : "NEWS_DETAIL_SCROLLDOWN",
      scrollUpDetail : "NEWS_DETAIL_SCROLLUP"
    },
  }
},

```

## Template
You can redesign output with `template.html`. Default is this;
```html
<div class="article %CLASSNAME%" id="%ARTICLEID%">
  <div class="header">
    <div class="title">%TITLE%</div>
  </div>
  <div class="content">
    <!-- <img src="%URLTOIMAGE%"/> -->
    %ARTICLEIMAGE%
    %DESCRIPTION%
  </div>
  <div class="footer">
    <div class="sourceName" id="%SOURCEID%">%SOURCENAME%</div>
    <div class="publishedAt"> - %PUBLISHEDAT%</div>
  </div>
</div>
```
### Available Template Tags

|Tag | Example | Description |
|---|---|---|
|%SOURCEID% | `cnn` or `N-tv-de` | Unique `id` of each news site. |
|%SOURCENAME%| `cnn.com` or `N-tv.de` | `name` of each news site. |
|%AUTHOR% | `John Doe` | Author of this article. |
|%TITLE%| `Who Framed Roger Rabbit` | Title of this article. |
|%DESCRIPTION%| `blah blah blah...` | Short description of this article (not article itself). |
|%CONTENT%| `blah blah blah...` | Full or Shorten news articles. it may differ by each news site. |
|%ARTICLEID%| `X12345678` | Unique `id` of each news article. |
|%PUBLISHEDAT%| `2 hours ago` or `2018-10-01 12:34:56` | Published time. |
|%URL%| `http://cnn.com/...` | URL of original news article. |
|%URLTOIMAGE% |`http://image.cnn.com/...` | URL of image. (if exists)|
|%ARTICLEIMAGE%| `<img src="http://image.cnn.com/..."... >` | Ready-made image tag. |
|%CLASSNAME%| `someClassName` | When you give `className` to `query`, that value will be used as this. |


## `MMM-TelegramBot` commands
|command | Description |
|---|---|
|`/news`| Send current news link to Telegram.|
|`/news n`| Next article |
|`/news p`| Previous article |
|`/news c`| Close detail iframe page |
|`/news u`| Scroll Up detail iframe page |
|`/news d`| Scroll Down detail iframe page |

## Notification commands
|notification | Description |
|---|---|
|`NEWS_NEXT`| Next article |
|`NEWS_PREVIOUS`| Previous article |
|`NEWS_DETAIL`| Open detail iframe page of current news|
|`NEWS_DETAIL_CLOSE`| Close detail iframe page |
|`NEWS_DETAIL_SCROLLUP`| Scroll Up detail iframe page |
|`NEWS_DETAIL_SCROLLDOWN`| Scroll Down detail iframe page |
