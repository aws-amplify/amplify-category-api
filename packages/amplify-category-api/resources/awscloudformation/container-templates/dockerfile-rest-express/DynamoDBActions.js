const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const docClient = DynamoDBDocument.from(new DynamoDB());

const TableName = process.env.STORAGE_POSTS_NAME;

const addPostToDDB = async ({ id, title, author, description, topic }) => {

    var params = {
        Item: {
            id: parseInt(id, 10),
            title: title,
            author: author,
            description: description,
            topic: topic
        },
        TableName: TableName
    }
    try {
        const data = await docClient.put(params)
        return params.Item;
    } catch (err) {
        console.log('Error: ' + err);
        return err
    }
}

const scanPostsFromDDB = async () => {
    var params = {
        TableName: TableName,
    }

    try {
        const data = await docClient.scan(params);
        return data.Items;
    } catch (err) {
        console.log('Error: ' + err);
        return err;
    }
}

const getPostFromDDB = async (id) => {
    const key = parseInt(id, 10);
    var params = {
        TableName: TableName,
        Key: { id: key },
    }
    try {
        const data = await docClient.get(params)
        return data.Item;
    } catch (err) {
        console.log('Error: ' + err);
        return err
    }
}

module.exports = {
    addPostToDDB,
    scanPostsFromDDB,
    getPostFromDDB
};