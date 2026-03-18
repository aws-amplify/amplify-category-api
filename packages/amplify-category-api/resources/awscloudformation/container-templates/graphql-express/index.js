'use strict';
const PORT = 3000;
var express = require('express');
var { createHandler } = require('graphql-http/lib/use/express');
var { buildSchema } = require('graphql');
var Query = require('./schema.js');
var root = require('./resolvers.js');
var app = express();
// Enable CORS for all methods
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
});
app.all('/graphql', createHandler({
    schema: buildSchema(Query),
    rootValue: root,
}));
app.get('/', (req, res, next) => {
    try {
      res.redirect('/graphql');
    } catch (err){
      next(err);
    }
  });
app.listen(PORT, () => console.log('Listening on localhost:' + PORT + '/graphql'));
