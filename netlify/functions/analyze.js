// Netlify Function: analyze.js
// Optimized for Claude Sonnet 4.5 with prompt caching
// UK Emergency Medicine Guidelines Compliant

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

        // ENHANCED system prompt with UK guidelines and dual interpretation methods
        // This will be CACHED and reused, saving ~90% on repeated calls
        const systemPrompt = `You are a UK emergency medicine consultant providing comprehensive blood gas interpretation using evidence-based guidelines.

CRITICAL REQUIREMENTS:
1. Use UK-SPECIFIC GUIDELINES for all diagnoses:
   - DKA: Joint British Diabetes Societies (JBDS) criteria
   - Respiratory: British Thoracic Society (BTS) guidelines
   - AKI: NICE CG169
   - Sepsis: UK Sepsis Trust guidelines
   
2. Provide DUAL INTERPRETATION METHODS:
   - Henderson-Hasselbalch approach (traditional acid-base)
   - Stewart physiochemical approach (quantitative)

3. Calculate ALL relevant parameters:
   - Anion gap (AG) = Na+ - (Cl- + HCO3-) [Normal: 8-16 mmol/L]
   - Delta ratio (ΔAG/ΔHCO3) for mixed disorders
   - Corrected anion gap for albumin (if albumin <40 g/L)
   - Strong Ion Difference (SID) = (Na+ + K+) - (Cl- + HCO3-) [Normal: 40-44 mEq/L]
   - Strong Ion Gap (SIG) for unmeasured anions
   - A-a gradient (if FiO2 and pO2 available) = [(FiO2×(101.3-6.3)) - (pCO2/0.8)] - pO2 [Normal: <2 kPa on room air]
   - Corrected calcium (if albumin available) = Ca2+ + 0.02×(40-albumin)
   - Expected compensation for acid-base disorders
   - Winter's formula for metabolic acidosis (if applicable)

4. UK DIAGNOSTIC CRITERIA:
   - DKA (JBDS): pH <7.3 OR HCO3 <15 mmol/L + blood ketones >3 mmol/L (or urine 2+) + blood glucose >11 mmol/L
   - Respiratory failure: Type 1 (pO2 <8 kPa on air), Type 2 (pO2 <8 kPa + pCO2 >6 kPa)
   - Hyperlactataemia: >2 mmol/L (sepsis if >4 mmol/L)
   - Acute hyperkalaemia: >6.5 mmol/L = medical emergency

RESPONSE FORMAT (be thorough and systematic):

**Executive Summary**
2-3 sentences: Most critical findings and immediate clinical actions needed

**Henderson-Hasselbalch Interpretation**
- Primary disorder (acidosis/alkalosis, metabolic/respiratory)
- Degree of compensation (appropriate/inappropriate)
- Expected vs actual compensation calculations
- Any mixed disorders identified

**Stewart Physiochemical Interpretation**
- Strong Ion Difference (SID) analysis
- Strong Ion Gap (SIG) for unmeasured anions
- Contribution of weak acids (albumin, phosphate)
- Free water effect assessment

**Comprehensive Calculations**
Show ALL workings with normal ranges:
- Anion gap (corrected if albumin abnormal)
- Delta ratio (if AG elevated)
- A-a gradient (if oxygen data available)
- Corrected calcium (if albumin abnormal)
- Expected compensation formulas applied

**Differential Diagnoses (Top 3-5)**
Rank by likelihood based on clinical context. For each:
- Diagnosis name
- Supporting evidence from blood gas
- UK guideline criteria met/not met
- Additional tests needed

**Immediate Management**
Evidence-based actions prioritised by urgency:
- Emergency interventions (if critical values)
- Specific treatments for identified disorders
- Further investigations required
- Monitoring parameters
- Escalation triggers (HDU/ITU criteria if applicable)

**Red Flags & Safety Netting**
- Critical values requiring immediate action
- Life-threatening differentials not to miss
- When to call for senior help

Use UK terminology (e.g., "ITU" not "ICU", "paracetamol" not "acetaminophen"). Reference specific UK guidelines where applicable.`;

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
                max_tokens: 3000,  // Increased for comprehensive analysis
                system: [
                    {
                        type: 'text',
                        text: systemPrompt,
                        cache_control: { type: 'ephemeral' } // CACHE THIS - reused across calls
                    }
                ],
                messages: [
                    {
                        role: 'user',
                        content: `Analyse this blood gas comprehensively using both Henderson-Hasselbalch and Stewart methods. Apply UK guidelines for all diagnoses.

${formattedData}

Provide complete interpretation with all calculations shown, differential diagnoses, and evidence-based management plan.`
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
        
        // Log usage for monitoring (including cache metrics)
        console.log('[Claude] Usage:', JSON.stringify(data.usage));
        if (data.usage.cache_creation_input_tokens) {
            console.log('[Claude] Cache created:', data.usage.cache_creation_input_tokens, 'tokens');
        }
        if (data.usage.cache_read_input_tokens) {
            console.log('[Claude] Cache hit:', data.usage.cache_read_input_tokens, 'tokens (cost savings!)');
        }
        
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
                model: 'claude-sonnet-4-5',
                cacheHit: data.usage.cache_read_input_tokens > 0
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
    let formatted = `SAMPLE TYPE: ${sampleType}\n\n`;
    
    formatted += `ESSENTIAL BLOOD GAS VALUES:\n`;
    if (values.ph !== null && values.ph !== undefined) formatted += `  pH: ${values.ph} (normal: 7.35-7.45)\n`;
    if (values.pco2) formatted += `  pCO₂: ${values.pco2} kPa (normal: 4.7-6.0 kPa)\n`;
    if (values.po2) formatted += `  pO₂: ${values.po2} kPa (normal: 11-13 kPa on air)\n`;
    if (values.hco3) formatted += `  HCO₃⁻: ${values.hco3} mmol/L (normal: 22-26 mmol/L)\n`;
    if (values.be !== null && values.be !== undefined) formatted += `  Base Excess: ${values.be} mmol/L (normal: -2 to +2 mmol/L)\n`;
    
    formatted += `\nELECTROLYTES:\n`;
    if (values.sodium) formatted += `  Na⁺: ${values.sodium} mmol/L (normal: 135-145 mmol/L)\n`;
    if (values.potassium) formatted += `  K⁺: ${values.potassium} mmol/L (normal: 3.5-5.0 mmol/L)\n`;
    if (values.chloride) formatted += `  Cl⁻: ${values.chloride} mmol/L (normal: 98-106 mmol/L)\n`;
    
    formatted += `\nOTHER PARAMETERS:\n`;
    if (values.lactate) formatted += `  Lactate: ${values.lactate} mmol/L (normal: <2.0 mmol/L)\n`;
    if (values.glucose) formatted += `  Glucose: ${values.glucose} mmol/L (normal: 3.9-5.6 mmol/L)\n`;
    if (values.albumin) formatted += `  Albumin: ${values.albumin} g/L (normal: 35-50 g/L)\n`;
    if (values.calcium) formatted += `  Ca²⁺: ${values.calcium} mmol/L (normal: 2.20-2.60 mmol/L)\n`;
    if (values.hb) formatted += `  Haemoglobin: ${values.hb} g/L\n`;
    if (values.fio2) formatted += `  FiO₂: ${values.fio2}%\n`;
    
    if (clinicalHistory && clinicalHistory.trim()) {
        formatted += `\nCLINICAL CONTEXT:\n${clinicalHistory}\n`;
    }
    
    return formatted;
}

// Enhanced parsing to handle new section structure
function parseAnalysisIntoSections(text) {
    const sections = {
        summary: '',
        hendersonHasselbalch: '',
        stewart: '',
        detailedAnalysis: '',
        differentials: '',
        recommendations: '',
        redFlags: ''
    };

    // Match patterns for each section (case-insensitive, flexible formatting)
    const patterns = {
        summary: /\*?\*?Executive Summary\*?\*?[\s:]*\n?(.*?)(?=\n\n?\*?\*?(?:Henderson|Stewart|Comprehensive|Differential|Immediate|Red Flag|$))/is,
        hendersonHasselbalch: /\*?\*?Henderson[-\s]?Hasselbalch.*?\*?\*?[\s:]*\n?(.*?)(?=\n\n?\*?\*?(?:Stewart|Comprehensive|Differential|Immediate|Red Flag|$))/is,
        stewart: /\*?\*?Stewart.*?\*?\*?[\s:]*\n?(.*?)(?=\n\n?\*?\*?(?:Comprehensive|Differential|Immediate|Red Flag|$))/is,
        detailedAnalysis: /\*?\*?Comprehensive Calculations?\*?\*?[\s:]*\n?(.*?)(?=\n\n?\*?\*?(?:Differential|Immediate|Red Flag|$))/is,
        differentials: /\*?\*?Differential Diagnos[ie]s.*?\*?\*?[\s:]*\n?(.*?)(?=\n\n?\*?\*?(?:Immediate|Red Flag|$))/is,
        recommendations: /\*?\*?Immediate Management\*?\*?[\s:]*\n?(.*?)(?=\n\n?\*?\*?(?:Red Flag|$))/is,
        redFlags: /\*?\*?Red Flags.*?\*?\*?[\s:]*\n?(.*?)$/is
    };

    // Extract each section
    for (const [key, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match) {
            sections[key] = match[1].trim();
        }
    }

    // Combine Henderson and Stewart for primary interpretation display
    if (sections.hendersonHasselbalch || sections.stewart) {
        sections.primaryInterpretation = 
            (sections.hendersonHasselbalch ? '**Henderson-Hasselbalch:**\n' + sections.hendersonHasselbalch + '\n\n' : '') +
            (sections.stewart ? '**Stewart Method:**\n' + sections.stewart : '');
    }

    // Fallback: if no structured sections found
    if (!sections.summary && !sections.hendersonHasselbalch && !sections.stewart) {
        // Try to extract at least a summary from the first paragraph
        const paragraphs = text.split('\n\n');
        if (paragraphs.length > 0) {
            sections.summary = paragraphs[0];
            sections.detailedAnalysis = paragraphs.slice(1).join('\n\n');
        } else {
            sections.detailedAnalysis = text;
        }
    }

    return sections;
}
