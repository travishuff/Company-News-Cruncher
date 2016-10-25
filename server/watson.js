const request = require('request');
var watson = require('watson-developer-cloud');
var alchemy_language = watson.alchemy_language({
  api_key: '6e3edf7b9c31fb749ea18b50bbb0a6f28731df30'
});

const watsonController = {
  // getData: (req, res, next) => {
  //   console.log('accepted request from scraper: ', res.statusCode);

  //   request('https://news.ycombinator.com/', (error, response, html) => {
  //     if (error) console.error(error);
      
  //     const data = JSON.stringify('U have entered');

  //     res.set('Content-Type', 'application/JSON');
  //     res.send(data);
      
  //     //  where do I put 'next();' command?
  //   });
  // }

  getData: () => {
    let parameters = {
      extract: 'title,doc-sentiment',
      // sentiment: 1,
      maxRetrieve: 3,
      url: 'http://www.fool.com/investing/2016/10/25/3-questions-for-apple-inc-ceo-tim-cook-today.aspx'
    };

    alchemy_language.combined(parameters, function (err, response) {
      if (err)
        console.log('error:', err);
      else
        console.log(JSON.stringify(response, null, 2));
    });
    // next();
  },

  getNews: (req, res, next) => {
    console.log('accepted request: ', res.statusCode);

    const APIKEY = '6e3edf7b9c31fb749ea18b50bbb0a6f28731df30';
    let url = 'https://gateway-a.watsonplatform.net/calls/data/GetNews?apikey=6e3edf7b9c31fb749ea18b50bbb0a6f28731df30&outputMode=json&outputMode=json&start=now-7d&end=now&count=1&return=enriched,original';
    const urlStart = 'https://gateway-a.watsonplatform.net/calls/data/GetNews';

    request(url, (error, response, html) => {
      if (error) console.error(error);

      // console.log(response.body);
      // res.set('Content-Type', 'application/JSON');
      res.send(JSON.stringify(response.body));
      
      //  where do I put 'next();' command?
    });
    // next();
  }

};

module.exports = watsonController;
