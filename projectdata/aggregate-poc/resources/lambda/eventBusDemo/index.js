/* eslint-disable @typescript-eslint/explicit-function-return-type, spellcheck/spell-checker */
/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, no-console */
// const AWSXRay = require('aws-xray-sdk');
// const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const AWS = require('aws-sdk');

const EventBusName = process.env.EVENT_BUS_NAME;

const eventBridge = new AWS.EventBridge();

/**
 * Triggers a bus event.
 */
exports.trigger = async event => {
  console.debug(event);
  const response = await eventBridge.putEvents({
    Entries: [{
      // Event envelope fields
      Source: 'custom.myATMapp',
      EventBusName,
      DetailType: 'transaction',
      Time: new Date(),

      // Main event body
      Detail: JSON.stringify({
        message: event.arguments.message,
      }),
    }],
  }).promise();
  return response.Entries[0].EventId;
};

/**
 * Responds to a matched bus event.
 */
exports.respond = event => {
  console.debug(event);
  return event;
};
