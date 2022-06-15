let AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2'});

let TableName = 'Aggregates';


const query_item_count = async ({table_name, year, letter1, letter2, count, LastKey}) => {
  var params = {
    TableName: table_name,
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
    if (err) {
      console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
        //console.log("Query succeeded.");
        //console.log(`Adding ${data.Count} to ${counter}...`)
        counter = counter + data.Count;
        //console.log(`The count is now ${counter}`);
        //console.log(`There are ${data.Count} items in the query and LastEvaluatedKey is: ${JSON.stringify(data.LastEvaluatedKey)}`);
        if (typeof data.LastEvaluatedKey != "undefined") {
          //console.log("Querying more...");
          query_item_count({table_name, year, letter1, letter2, count: counter, LastKey: data.LastEvaluatedKey});
        } else {
          return counter
        }
    }
  }).promise();
  
  return counter;
}

const updateCount_Type_QueryExpression = async (Type, QueryExpression, Count) => {
    
    let params = { 
        TableName,
        Item: {
            Type,
            QueryExpression,
            "COUNT": Count
        },
    };
    
    try {
        console.log(params)
        const data = await docClient.put(params).promise();
        return data;
    } catch (err) {
        throw err;
    }

}

    
exports.handler = async (event) => {
    //console.log(event);
    
    const Model = event.Model;
    const QueryExpression = event.Query;
    const args = event.args;

    
    //Notes from Manuel on the sync latency:
    // Can we move the below code to another Lambda that we "fire and forget" then immediately return the response?
    // Can you do Async Lambda with HTTP resolvers?
    
    let updated_count = await query_item_count({table_name: Model, year: args.year, letter1: args.letter1, letter2: args.letter2, count: 0});
    console.log(updated_count);
    let res = await updateCount_Type_QueryExpression(Model, QueryExpression, updated_count);
    return res;
};