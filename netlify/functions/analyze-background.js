// Background function to perform ABG analysis without hitting Netlify’s 10‑second timeout.
// This function generates a job ID, kicks off the existing analysis routine in the
// background and returns immediately with a 202 Accepted response.  The results
// are stored in an in‑memory object keyed by jobId.  For production use you
// should replace the global store with a persistent data store (e.g. Redis or DynamoDB).

const { randomUUID } = require('crypto');
// Global store of pending/completed jobs.  In production this should be persisted.
const jobStore = {};

exports.handler = async function (event, context) {
  // Allow asynchronous work to continue after the handler returns
  context.callbackWaitsForEmptyEventLoop = false;

  const payload = JSON.parse(event.body || '{}');
  const jobId = randomUUID()();

  // Start the analysis in the background
  performAnalysis(jobId, payload).catch(err => {
    jobStore[jobId] = { done: true, error: err.message };
  });

  return {
    statusCode: 202,
    body: JSON.stringify({ jobId })
  };
};

async function performAnalysis(jobId, data) {
  const result = await runAnalysis(data);
  jobStore[jobId] = { done: true, result };
}

async function runAnalysis(data) {
  /*
   * Copy the existing logic from netlify/functions/analyze.js to call the AI API
   * and build the structured analysis.  This function should return a JSON
   * object with keys: executiveSummary, primaryInterpretation, keyCalculations,
   * differentials, actions.
   */
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const messages = [{
    role: 'user',
    content: buildPrompt(data)
  }];
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      // Use the latest Claude Sonnet 4.5 model for best performance and accuracy
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      temperature: 0.0,
      messages
    })
  });
  const { content } = await response.json();
  return JSON.parse(content);
}

function buildPrompt(data) {
  /*
   * Builds the prompt string for the Anthropic model from the ABG/VBG values.
   * Copy this from your existing analyze.js file.
   */
  return `Please analyse the following blood gas:\n${JSON.stringify(data)}`;
}

// Export the jobStore so that other functions can read results
exports.jobStore = jobStore;
