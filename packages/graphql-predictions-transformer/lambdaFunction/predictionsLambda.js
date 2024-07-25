const { Polly } = require('@aws-sdk/client-polly');
const { getSynthesizeSpeechUrl } = require('@aws-sdk/polly-request-presigner');

exports.handler = function (event, context, callback) {
  if (event && event.action === 'convertTextToSpeech') {
    convertTextToSpeech(event, callback);
  } else {
    callback(Error('Action not configured.'));
  }
};

/**
 * This function does the following for the textToSpeech action
 * - Synthesize Speech
 * - Get a presigned url for that synthesized speech
 * @param {*} event
 * @param {*} callback
 */
async function convertTextToSpeech(event, callback) {
  try {
    const params = {
      OutputFormat: 'mp3',
      SampleRate: '8000',
      Text: event.text,
      TextType: 'text',
      VoiceId: event.voiceID,
    };
    const client = new Polly();
    const url = await getSynthesizeSpeechUrl({ client, params });
    callback(null, { url: url });
  } catch (err) {
    console.log(err, err.stack);
    callback(Error(err));
  }
}
