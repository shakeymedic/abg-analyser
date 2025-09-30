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
        const { bloodGasData } = JSON.parse(event.body);

        if (!bloodGasData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Blood gas data is required' })
            };
        }

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
        const systemPrompt = `You are an expert consultant in respiratory medicine and critical care, specialising in arterial and venous blood gas interpretation. Your role is to provide thorough, clinically accurate analysis suitable for medical professionals.

INTERPRETATION FRAMEWORK:
1. Assess oxygenation status (PaO2, SaO2, A-a gradient if FiO2 provided)
2. Determine acid-base status (pH, PaCO2, HCO3, base excess)
3. Identify primary disorder and any compensation
4. Calculate relevant indices (anion gap, A-a gradient, osmolal gap if applicable)
5. Provide differential diagnoses based on the pattern
6. Suggest clinical correlation and next steps

RESPONSE STRUCTURE:
- Executive Summary: 2-3 sentence clinical bottom line
- Primary Interpretation: Main acid-base and oxygenation findings
- Detailed Analysis: Step-by-step reasoning with calculations
- Differential Diagnoses: Ranked by likelihood with brief rationales
- Clinical Recommendations: Immediate actions and further investigations

Use clear medical terminology appropriate for qualified clinicians. Include relevant calculations and reference ranges. Be systematic, thorough, and clinically practical.`;

        console.log('[Claude] Sending analysis request to Anthropic API');

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
                max_tokens: 2500,
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
                        content: `Please analyse the following blood gas results and provide a comprehensive interpretation:

${bloodGasData}

Provide a structured analysis including executive summary, primary interpretation, detailed analysis with calculations, differential diagnoses, and clinical recommendations.`
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
