const express = require('express');
const app = express();
const path = require('path');

const watsonController = require('./watson');

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.static(path.join(__dirname, '../client/' )));

// app.get('/', watsonController.getData);
// app.post('/', watsonController.getData);

app.get('/getNews', watsonController.getNews);
app.post('/getNews', watsonController.getNews);

app.listen(3000);

module.exports = app;
