const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const docClient = DynamoDBDocument.from(new DynamoDB());

const TableName = process.env.STORAGE_POSTS_NAME;

const addPostToDDB = async ({ id, title, author, description, topic }) => {
    var params = {
        Item: {
            id: id,
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
        console.log(err);
        return err;
    }
}

const getPostFromDDB = async (id) => {
    var params = {
        TableName: TableName,
        Key: id,
    }
    try {
        const data = await docClient.get(params)
        return data.Item;
    } catch (err) {
        return err
    }
}

var root = {
    getPost: getPostFromDDB,
    posts: scanPostsFromDDB,
    addPost: addPostToDDB
};

module.exports = root;
