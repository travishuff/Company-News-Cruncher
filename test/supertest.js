const expect = require('chai').expect;
const request = require('supertest');
// const path = require('path');
// const fs = require('fs');
const app = require('../server/server');
const PORT = process.env.PORT || 3000;
const HOST = `http://localhost:${PORT}`;

describe('Route integration', () => {

  describe('/', () => {

    describe('GET', () => {
      it('responds with 200 status and text/html content type', done => {
        request(HOST)
          .get('/')
          .expect('Content-Type', /text\/html/)
          .expect(200, done);
      });
    });

  });

  describe('/getNews', () => {

    describe('GET', () => {
      it('responds with 200 status and "text/html; charset=utf-8" content type', done => {
          request(HOST)
          .get('/getNews')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect(200, done);
      });
    });

    describe('POST', () => {
      it('responds to valid request with 200 status and application/json content type', done => {
        request(HOST)
          .post('/getNews')
          .send({FB: 'FB'})
          .expect('Content-Type', /application\/json/)
          .expect(200, done);
      });

      it('responds to invalid request with 400 status and error message in body', done => {
        request(HOST)
          .post('/getNews')
          .send({})
          .expect(404, done);
      });
    });

  });

});
