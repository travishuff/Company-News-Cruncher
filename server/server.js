const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const cache = require('apicache').middleware;

const { getData, getNews, getTicker } = require('./watson');

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.static(path.join(__dirname, '../client/' )));

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './../client/index.html'))
});

app.post('/getNews', getNews, getData);
// app.post('/getNews', cache('3 minutes'), watsonController.getNews);

app.post('/getTicker', cache('1 minutes'), getTicker);

app.listen(3000);

module.exports = app;
