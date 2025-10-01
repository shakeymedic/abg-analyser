// Netlify Function: analyze.js
// Optimized for Claude Sonnet 4.5 with prompt caching

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const requestBody = JSON.parse(event.body);
        
        // Handle both old and new format
        const bloodGasData = requestBody.bloodGasData || requestBody;

        if (!bloodGasData || !bloodGasData.values) {
            console.error('[Claude] Invalid request format:', requestBody);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Blood gas data is required' })
            };
        }

        const { values, clinicalHistory, sampleType } = bloodGasData;

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('ANTHROPIC_API_KEY is not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // Optimised system prompt with prompt caching
        // This will be cached and reused, saving ~90% on repeated calls
        const systemPrompt = `You are an expert consultant providing concise, clinically-focused blood gas interpretation.

RESPONSE FORMAT (be concise but thorough):
1. Executive Summary (2-3 sentences): Clinical bottom line
2. Primary Interpretation (3-4 sentences): Main findings
3. Key Calculations: Anion gap, A-a gradient if applicable
4. Top 3 Differential Diagnoses: Most likely causes
5. Immediate Actions (2-3 points): Critical next steps

Use clear medical terminology. Be systematic but concise. Focus on clinical utility.`;

        console.log('[Claude] Sending analysis request to Anthropic API');

        // Format the blood gas data nicely for Claude
        const formattedData = formatBloodGasData(values, clinicalHistory, sampleType);

        // Call Claude API with prompt caching
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1500,  // Reduced from 2500 for faster response
                system: [
                    {
                        type: 'text',
                        text: systemPrompt,
                        cache_control: { type: 'ephemeral' } // Enable prompt caching
                    }
                ],
                messages: [
                    {
                        role: 'user',
                        content: `Analyse these blood gas results concisely:

${formattedData}

Provide: Executive Summary, Primary Interpretation, Key Calculations, Top 3 Differentials, and Immediate Actions. Be thorough but concise.`
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Claude] API Error:', response.status, errorText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `Claude API error: ${response.status}`,
                    details: errorText
                })
            };
        }

        const data = await response.json();
        
        // Log usage for monitoring
        console.log('[Claude] Usage:', JSON.stringify(data.usage));
        
        // Extract the response text
        const analysisText = data.content[0].text;

        // Parse the response into structured sections
        const sections = parseAnalysisIntoSections(analysisText);

        console.log('[Claude] Analysis completed successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                analysis: analysisText,
                sections: sections,
                usage: data.usage,
                model: 'claude-sonnet-4-5'
            })
        };

    } catch (error) {
        console.error('[Claude] Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Helper function to format blood gas data for Claude
function formatBloodGasData(values, clinicalHistory, sampleType) {
    let formatted = `Sample Type: ${sampleType}\n\n`;
    formatted += `ESSENTIAL VALUES:\n`;
    if (values.ph) formatted += `pH: ${values.ph}\n`;
    if (values.pco2) formatted += `pCO2: ${values.pco2} kPa\n`;
    if (values.po2) formatted += `pO2: ${values.po2} kPa\n`;
    if (values.hco3) formatted += `HCO3-: ${values.hco3} mmol/L\n`;
    if (values.be) formatted += `Base Excess: ${values.be} mmol/L\n`;
    
    formatted += `\nELECTROLYTES:\n`;
    if (values.sodium) formatted += `Na+: ${values.sodium} mmol/L\n`;
    if (values.potassium) formatted += `K+: ${values.potassium} mmol/L\n`;
    if (values.chloride) formatted += `Cl-: ${values.chloride} mmol/L\n`;
    
    formatted += `\nOTHER VALUES:\n`;
    if (values.lactate) formatted += `Lactate: ${values.lactate} mmol/L\n`;
    if (values.glucose) formatted += `Glucose: ${values.glucose} mmol/L\n`;
    if (values.albumin) formatted += `Albumin: ${values.albumin} g/L\n`;
    if (values.calcium) formatted += `Ca2+: ${values.calcium} mmol/L\n`;
    if (values.hb) formatted += `Haemoglobin: ${values.hb} g/L\n`;
    if (values.fio2) formatted += `FiO2: ${values.fio2}%\n`;
    
    if (clinicalHistory) {
        formatted += `\nCLINICAL CONTEXT:\n${clinicalHistory}\n`;
    }
    
    return formatted;
}

// Helper function to parse analysis into sections
function parseAnalysisIntoSections(text) {
    const sections = {
        summary: '',
        primaryInterpretation: '',
        detailedAnalysis: '',
        differentials: '',
        recommendations: ''
    };

    // Simple section parsing - looks for common headers
    const summaryMatch = text.match(/(?:Executive Summary|Summary):?\s*\n?(.*?)(?=\n(?:Primary|Detailed|Differential|Clinical|$))/is);
    const primaryMatch = text.match(/Primary (?:Interpretation|Findings?):?\s*\n?(.*?)(?=\n(?:Detailed|Differential|Clinical|$))/is);
    const detailedMatch = text.match(/Detailed Analysis:?\s*\n?(.*?)(?=\n(?:Differential|Clinical|$))/is);
    const differentialMatch = text.match(/Differential Diagnos[ie]s:?\s*\n?(.*?)(?=\n(?:Clinical|Recommendations|$))/is);
    const recommendationsMatch = text.match(/(?:Clinical Recommendations?|Recommendations?):?\s*\n?(.*?)$/is);

    if (summaryMatch) sections.summary = summaryMatch[1].trim();
    if (primaryMatch) sections.primaryInterpretation = primaryMatch[1].trim();
    if (detailedMatch) sections.detailedAnalysis = detailedMatch[1].trim();
    if (differentialMatch) sections.differentials = differentialMatch[1].trim();
    if (recommendationsMatch) sections.recommendations = recommendationsMatch[1].trim();

    // Fallback: if no sections found, put everything in detailed analysis
    if (!summaryMatch && !primaryMatch && !detailedMatch && !differentialMatch && !recommendationsMatch) {
        sections.detailedAnalysis = text;
    }

    return sections;
}
