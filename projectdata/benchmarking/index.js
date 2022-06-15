
/**
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This file is licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
*/
var AWS = require("aws-sdk");
var fs = require("fs");

AWS.config.update({
  region: "us-east-2",
});

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var table = "Movies";

function init_table(){
  var params = {
      TableName : "Movies",
      KeySchema: [       
          { AttributeName: "year", KeyType: "HASH"},  //Partition key
          { AttributeName: "title", KeyType: "RANGE" }  //Sort key
      ],
      AttributeDefinitions: [       
          { AttributeName: "year", AttributeType: "N" },
          { AttributeName: "title", AttributeType: "S" }
      ],
      ProvisionedThroughput: {       
          ReadCapacityUnits: 10, 
          WriteCapacityUnits: 10
      }
  };
  
  dynamodb.createTable(params, function(err, data) {
      if (err) {
          console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
      }
  });
}

function getRandomInt(min, max) {
  min = Math.floor(min);
  max = Math.ceil(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function getRandomChars(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
      charactersLength));
    }
   return result + " - ";
}

function load_data(){
  var allMovies = JSON.parse(fs.readFileSync('moviedata.json', 'utf8'));

  for (i=1; i<10; i++){

    let randYear = getRandomInt(11, 99) + i;
    let randTitle = getRandomChars(5);
    
    allMovies.forEach(function(movie) {
      var params = {
        TableName: "Movies",
        Item: {
          "year": 2013,//  movie.year + randYear,
          "title": randTitle + movie.title,
          "info":  movie.info
        }
      };
  
        docClient.put(params, function(err, data) {
          if (err) {
              console.error("Unable to add movie", movie.title, ". Error JSON:", JSON.stringify(err, null, 2));
          } else {
              console.log("PutItem succeeded:", movie.title);
          }
        });
    });
  
  }
}

const put_data = ({year, title, plot, rating}) => {
  var params = {
    TableName: table,
    Item: {
        year : year,
        title : title,
        info : {
          plot : plot,
          rating : rating
        }
    }
  };

  console.log("Adding a new item...");
  docClient.put(params, function(err, data) {
      if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
      }
  });
}

const get_item = ({year, title}) => {
  var params = {
    TableName: table,
    Key: {
        year : year,
        title : title,
    }
  }

  docClient.get(params, function(err, data) {
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
    }
});
}

const query_item_count = async ({year, letter1, letter2, count, LastKey}) => {

  
  var params = {
    TableName : table,
    //ProjectionExpression:"#yr, title, info.genres, info.actors[0]",
    KeyConditionExpression: "#yr = :yyyy AND title between :letter1 and :letter2",
    ExpressionAttributeNames:{
      "#yr": "year"
    },
    ExpressionAttributeValues: {
      ":yyyy": year,
      ":letter1": letter1,
      ":letter2": letter2
    },
    Select: 'COUNT'
  };
  
  if (LastKey != "undefined") {
    params.ExclusiveStartKey = LastKey;
  }
  
  let counter = count;
  
  await docClient.query(params, (err, data) => {
    console.log('In the onQuery');
    if (err) {
      console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
        console.log("Query succeeded.");
        console.log(`Adding ${data.Count} to ${counter}...`)
        counter = counter + data.Count;
        console.log(`The count is now ${counter}`);
        console.log(`There are ${data.Count} items in the query and LastEvaluatedKey is: ${JSON.stringify(data.LastEvaluatedKey)}`);
        if (typeof data.LastEvaluatedKey != "undefined") {
          console.log("Querying more...");
          query_item_count({
            year, letter1, letter2,
            count: counter, LastKey: data.LastEvaluatedKey
          })
        }
    }
  });

  return counter;
}


/**format of input is to take long and short args like:
 * node index.js -D --name=Hello
 */
const getArgs = () => {
  const args = {};
  process.argv
    .slice(2, process.argv.length)
    .forEach(arg => {
      //handle the long arg in the format of --name==hello
      if(arg.slice(0,2) === '--'){
        const longArg = arg.split('=');
        const longArgFlag = longArg[0].slice(2, longArg[0].length);
        const longArgValue = longArg.length > 1 ? longArg[1] : true;
        args[longArgFlag] = longArgValue;
      }
      //handle the flags
      else if (arg[0] === '-'){
        const flags = arg.slice(1, arg.length).split('-');
        flags.forEach(flag => {
          args[flag] = true;
        });
      }
    });

  return args;
}

const main = async () => {
  const args = getArgs();
  console.log(args)
  if (args === {}){
    console.log('USAGE: \n\n node index.js -flag --key==value');
    console.log('Examples: \n\n');
    console.log('Load sample data \n node index.js -L');
    console.log('Run a query \n node index.js -Q --year=2013 --letter1=A --letter2=B');
    return;
  }
  //init_table();
  //load_data();
  //put_data({year: 2022, title: "Batman", plot: "Fights Ridler", rating: 5});
  //get_item({year: 2022, title: "Batman"});
  const count = await query_item_count({year: 2013, letter1: "A", letter2: "D", count: 0})
  console.log(`Final value is ${await count}`);
}

main();