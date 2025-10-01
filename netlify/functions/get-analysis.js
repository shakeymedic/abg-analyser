const { jobStore } = require('./analyze-background.js');

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const jobId = params.jobId;
  if (!jobId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing jobId' }),
    };
  }

  const result = jobStore[jobId];
  if (!result) {
    return {
      statusCode: 200,
      body: JSON.stringify({ done: false }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
