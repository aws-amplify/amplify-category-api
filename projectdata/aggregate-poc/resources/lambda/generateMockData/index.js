/* eslint-disable @typescript-eslint/explicit-function-return-type, spellcheck/spell-checker */
/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, no-console */
const fs = require('fs');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

const movieTableName = process.env.MOVIES_TABLE_NAME;

const getRandomInt = (min, max) => {
  const minFloor = Math.floor(min);
  const maxFloor = Math.ceil(max);
  return Math.floor(Math.random() * (maxFloor - minFloor) + minFloor);
};

const getRandomChars = length => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const loadAndScaleMockData = async () => {
  console.debug('About to read movieData file into memory.');
  const allMovies = JSON.parse(fs.readFileSync('moviedata.json', 'utf8'));
  console.debug(`moviedata file parsed, got ${allMovies.length} records, example record: ${JSON.stringify(allMovies[0])}`);

  // Fan out each movie into 10 movies with slight variation
  for (let i = 1; i < 10; i++) {
    for (const movie of allMovies) {
      // eslint-disable-next-line no-await-in-loop
      await writeMovie(movie);
    }
  }
};

const writeMovie = async movie => {
  const year = movie.year + getRandomInt(11, 99);
  const title = `${getRandomChars(5)} - ${movie.title}`;
  const { info } = movie;

  try {
    await docClient.put({
      TableName: movieTableName,
      Item: { year, title, info },
    }).promise();
    console.log(`PutItem succeeded: ${title}`);
    return Promise.resolve();
  } catch (err) {
    console.error(`Unable to add movie ${title}, Error: ${JSON.stringify(err)}`);
    return Promise.error();
  }
};

/**
 * Entry point to the lambda function.
 */
exports.handler = async event => {
  console.debug(event);
  await loadAndScaleMockData();
  return {};
};
