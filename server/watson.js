const request = require('request');
var watson = require('watson-developer-cloud');
var alchemy_language = watson.alchemy_language({
  api_key: '6e3edf7b9c31fb749ea18b50bbb0a6f28731df30'
});

const watsonController = {

  getData: (req, res, next) => {
    console.log('into getData:');
    let parameters = {
      extract: 'title,concepts,doc-sentiment',  //  can also add: entities,taxonomy,
      // sentiment: 1,
      maxRetrieve: 1,
      url: req.urlArr[0]  //  Set which article to analyze here.
    };

    alchemy_language.combined(parameters, function (err, response) {
      if (err)
        console.error('error:', err);
      else
        console.log('into alchemy request:', response);

        res.json(response);
    });
    // next();
  },

  getNews: (req, res, next) => {
    console.log('accepted request: ', res.statusCode);
    let company = Object.keys(req.body)[0];  // get the company from the form input
    console.log(`Company request: ${company}`);

    const APIKEY = '6e3edf7b9c31fb749ea18b50bbb0a6f28731df30';
    let url = `https://gateway-a.watsonplatform.net/calls/data/GetNews?outputMode=json&start=now-1d&end=now&count=1&q.enriched.url.title=${company}&return=enriched.url.url,enriched.url.title&apikey=${APIKEY}`;  //  SET # OF ARTICLES HERE
    // TREND ANALYSIS # of articles //  https://gateway-a.watsonplatform.net/calls/data/GetNews?outputMode=json&start=now-7d&end=now&timeSlice=1d&q.enriched.url.entities.entity=|text=${company},type=Company|&apikey=${APIKEY}

    request(url, (error, response, html) => {
      if (error) console.error(error);
      console.log(response.body);
      let parsed = JSON.parse(response.body);
      let urlArr = [];

      //  SET # OF ARTICLES HERE
      for (let i = 0; i < 1; i++) {
        urlArr.push(parsed.result.docs[i].source.enriched.url.url);
      }
      console.log(urlArr);
      req.urlArr = urlArr;
      next();
    });
  },

  getTicker: (req, res, next) => {
    console.log('response status:', res.statusCode);
    let ticker = Object.keys(req.body)[0];
    console.log(`ticker request: ${ticker}`);

    let url = `http://finance.google.com/finance/info?client=ig&q=NASDAQ%3A${ticker}`;

    request(url, (error, response, html) => {
      if (error) console.error(error);
      console.log(response.body);
      res.json(response.body);
    });

  }

};

module.exports = watsonController;
