const { Polly } = require('@aws-sdk/client-polly');
const { getSynthesizeSpeechUrl } = require('@aws-sdk/polly-request-presigner');

exports.handler = async function (event, context) {
  if (event && event.action === 'convertTextToSpeech') {
    return await convertTextToSpeech(event);
  } else {
    throw new Error('Action not configured.');
  }
};

/**
 * This function does the following for the textToSpeech action
 * - Synthesize Speech
 * - Get a presigned url for that synthesized speech
 * @param {*} event
 */
async function convertTextToSpeech(event) {
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
    return { url: url };
  } catch (err) {
    console.log(err, err.stack);
    throw err;
  }
}
