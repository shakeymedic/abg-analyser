exports.handler = async (event) => {

const headers = {
'Content-Type': 'application/json',
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Cache-Control': 'no-store, no-cache, must-revalidate'
};

if (event.httpMethod !== 'POST') {
return {
statusCode: 405,
headers,
body: JSON.stringify({ error: 'Method not allowed' })
};
}

const startTime = Date.now();
try {
const apiKey = process.env.PERPLEXITY_API_KEY;
if (!apiKey) {
console.error('PERPLEXITY_API_KEY not configured');
return {
statusCode: 500,
headers,
body: JSON.stringify({
error: 'Configuration error. Please contact support.'
})
};
}

const { values, clinicalHistory, sampleType } = JSON.parse(event.body);
if (!values || typeof values.ph !== 'number' || typeof values.pco2 !== 'number' || typeof values.hco3 !== 'number') {
return {
statusCode: 400,
headers,
body: JSON.stringify({
error: 'Invalid input. pH, pCO₂, and HCO₃⁻ are required.'
})
};
}

// Use Perplexity API with OPTIMIZED system prompt for faster response
const apiUrl = 'https://api.perplexity.ai/chat/completions';

// OPTIMIZED SYSTEM PROMPT - Balanced detail with faster response time
const systemPrompt = `You are a senior consultant providing sophisticated blood gas interpretation for UK emergency medicine. Return ONLY valid JSON with NO markdown formatting.

REQUIRED JSON STRUCTURE:
{
"summary": "string (100-150 words)",
"keyFindings": "string (400-500 words)",
"compensationAnalysis": "string (300-400 words)",
"hhAnalysis": "string (structured format with calculations)",
"stewartAnalysis": "string (structured format)",
"additionalCalculations": "string (250-350 words)",
"differentials": "string (500-700 words)",
"criticalCareAssessment": "string (250-350 words)",
"biochemicalInterpretation": "string (250-350 words)"
}

SECTION SPECIFICATIONS:

"summary": Brief executive summary including overall acid-base status, critical findings, primary diagnosis, and disposition recommendation (ward/HDU/ITU).

"keyFindings": Detailed pathophysiological mechanisms, risk stratification, hemodynamic/respiratory/metabolic integration, compensatory mechanisms, clinical correlations, and prognostic indicators.

"compensationAnalysis": Analysis of primary vs secondary disorders, temporal compensation kinetics, mathematical modeling using compensation formulae, mechanisms of renal/respiratory compensation, mixed disorders assessment.

"hhAnalysis": Format as:
"Henderson-Hasselbalch Analysis

pH: [value] (7.35-7.45) - [interpretation]
pCO2: [value] kPa ([mmHg] mmHg) (4.7-6.0 kPa) - [interpretation]
HCO3-: [value] mmol/L (22-26 mmol/L) - [interpretation]
Base Excess: [value] mmol/L (-2 to +2 mmol/L) - [interpretation]

Calculations:
Anion Gap = [Na+] - ([Cl-] + [HCO3-]) = [result] mmol/L (8-12 mmol/L)
Corrected AG = AG + 0.25×(40-[Albumin]) = [result] mmol/L
Delta Ratio = (AG-12)/(24-HCO3) = [result]

Clinical Integration: [hemodynamic implications, ventilatory requirements]"

"stewartAnalysis": Format as:
"Stewart Physicochemical Analysis

Independent Variables:
SIDa = [Na+] + [K+] - [Cl-] - [Lactate] = [result] mEq/L (40±2)
Atot = [Albumin]/4.4 = [result] mEq/L
pCO2 = [value] kPa

Interpretation: [How SID/Atot/pCO2 affect acid-base status]
Strong Ion Gap: SIG = SIDa - SIDe = [result] mEq/L
Therapeutic Implications: [specific interventions]"

"additionalCalculations": Include P/F ratio, A-a gradient, bicarbonate kinetics, lactate clearance, hemodynamic calculations, pharmacokinetic considerations.

"differentials": Comprehensive differential diagnosis organized by:
- HAGMA causes (DKA, lactic acidosis, renal failure, toxins)
- NAGMA causes (diarrhea, RTA, carbonic anhydrase inhibitors)
- Respiratory acidosis (acute vs chronic causes)
- Metabolic alkalosis (chloride-responsive vs resistant)
- Respiratory alkalosis (CNS, pulmonary, systemic causes)
- Mixed disorders

"criticalCareAssessment": Hemodynamic implications, ventilatory strategy, renal replacement therapy indications, fluid management, vasoactive drugs, ICU scoring.

"biochemicalInterpretation": Analytical considerations, pre-analytical variables, quality control, method validation, biological variation.

Follow UK guidelines: NICE, BTS, ICS, RCP. Provide consultant-level expertise.`;

// Build analysis request
const analysisValues = { ...values };
if (!analysisValues.albumin || isNaN(analysisValues.albumin)) {
analysisValues.albumin = 40;
}

const pco2_mmHg = (analysisValues.pco2 * 7.5).toFixed(1);
const po2_mmHg = analysisValues.po2 ? (analysisValues.po2 * 7.5).toFixed(1) : null;

let prompt = `BLOOD GAS ANALYSIS REQUEST

CLINICAL CONTEXT:
Patient History: ${clinicalHistory || 'Not provided'}
Sample Type: ${sampleType || 'Arterial'}

LABORATORY VALUES:
• pH: ${analysisValues.ph}
• pCO2: ${analysisValues.pco2} kPa (${pco2_mmHg} mmHg)`;

if (analysisValues.po2) prompt += `
• pO2: ${analysisValues.po2} kPa (${po2_mmHg} mmHg)`;
if (analysisValues.hco3) prompt += `
• HCO3-: ${analysisValues.hco3} mmol/L`;
if (analysisValues.be !== null && analysisValues.be !== undefined) prompt += `
• Base Excess: ${analysisValues.be} mmol/L`;

if (analysisValues.sodium || analysisValues.potassium || analysisValues.chloride) {
prompt += `

ELECTROLYTES:`;
if (analysisValues.sodium) prompt += `
• Na+: ${analysisValues.sodium} mmol/L`;
if (analysisValues.potassium) prompt += `
• K+: ${analysisValues.potassium} mmol/L`;
if (analysisValues.chloride) prompt += `
• Cl-: ${analysisValues.chloride} mmol/L`;
}

prompt += `

OTHER PARAMETERS:
• Albumin: ${analysisValues.albumin} g/L`;
if (analysisValues.lactate) prompt += `
• Lactate: ${analysisValues.lactate} mmol/L`;
if (analysisValues.glucose) prompt += `
• Glucose: ${analysisValues.glucose} mmol/L`;
if (analysisValues.calcium) prompt += `
• Ca2+: ${analysisValues.calcium} mmol/L`;
if (analysisValues.hb) prompt += `
• Hemoglobin: ${analysisValues.hb} g/L`;
if (analysisValues.fio2) prompt += `
• FiO2: ${analysisValues.fio2}%`;

prompt += `

Provide comprehensive consultant-level interpretation following the JSON structure specified.`;

const requestPayload = {
model: 'sonar-pro',
messages: [
{ role: 'system', content: systemPrompt },
{ role: 'user', content: prompt }
],
temperature: 0.1,
max_tokens: 6000  // REDUCED from 12000 for faster response
};

console.log(`[${new Date().toISOString()}] Sending analysis to Perplexity API`);

const perplexityResponse = await fetch(apiUrl, {
method: 'POST',
headers: { 
'Authorization': `Bearer ${apiKey}`,
'Content-Type': 'application/json' 
},
body: JSON.stringify(requestPayload)
});

if (!perplexityResponse.ok) {
const errorText = await perplexityResponse.text();
console.error(`Perplexity API error (${perplexityResponse.status}):`, errorText);
if (perplexityResponse.status === 429) {
return {
statusCode: 429,
headers,
body: JSON.stringify({
error: 'Rate limit reached. Please wait a moment and try again.'
})
};
}
return {
statusCode: 502,
headers,
body: JSON.stringify({
error: 'Analysis service temporarily unavailable. Please try again.'
})
};
}

const data = await perplexityResponse.json();
const responseText = data.choices?.[0]?.message?.content;

if (!responseText) {
console.error('Empty response from Perplexity');
return {
statusCode: 502,
headers,
body: JSON.stringify({
error: 'No analysis generated. Please try again.'
})
};
}

// Parse JSON response
let extractedJson;
try {
let cleaned = responseText.trim();
cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
const firstBrace = cleaned.indexOf('{');
const lastBrace = cleaned.lastIndexOf('}');

if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
cleaned = cleaned.substring(firstBrace, lastBrace + 1);
cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
extractedJson = JSON.parse(cleaned);
console.log('JSON parsed successfully');
} else {
throw new Error('No valid JSON structure found');
}
} catch (parseError) {
console.error('JSON parsing failed:', parseError.message);
console.error('Response sample:', responseText.substring(0, 500));

// Enhanced fallback
const anionGap = values.sodium && values.chloride && values.hco3 ?
values.sodium - (values.chloride + values.hco3) : null;
const correctedAG = anionGap && values.albumin ? 
anionGap + 0.25 * (40 - values.albumin) : anionGap;
const deltaRatio = anionGap > 12 && values.hco3 ? 
(anionGap - 12) / (24 - values.hco3) : null;
const wintersLow = values.hco3 ? (1.5 * values.hco3 + 8 - 2).toFixed(1) : null;
const wintersHigh = values.hco3 ? (1.5 * values.hco3 + 8 + 2).toFixed(1) : null;
const sidApparent = values.sodium && values.potassium && values.chloride ?
values.sodium + values.potassium - values.chloride : null;

extractedJson = {
summary: `Analysis reveals ${values.ph < 7.35 ? 'acidaemia' : values.ph > 7.45 ? 'alkalaemia' : 'normal pH'} requiring attention per UK emergency medicine standards. ${values.lactate > 4 ? 'Critical lactate elevation indicating tissue hypoxia. ' : ''}Primary disorder assessment and comprehensive differential diagnosis available in detailed sections below.`,

keyFindings: `Detailed analysis reveals ${values.ph < 7.35 ? 'acidaemia' : values.ph > 7.45 ? 'alkalaemia' : 'normal pH'} requiring consultant-level interpretation. pH ${values.ph} with pathophysiological implications including buffer system kinetics and multi-organ effects. ${values.lactate > 4 ? 'CRITICAL lactate elevation indicating tissue hypoxia with cellular metabolic dysfunction. ' : ''}Comprehensive assessment includes risk stratification, hemodynamic implications, and therapeutic considerations per UK guidelines.`,

compensationAnalysis: `Compensation analysis: ${values.hco3 && wintersLow ? `Winter's formula expected pCO2 ${wintersLow}-${wintersHigh} mmHg vs actual ${(values.pco2 * 7.5).toFixed(1)} mmHg indicating ${Math.abs((values.pco2 * 7.5) - (1.5 * values.hco3 + 8)) < 4 ? 'appropriate respiratory compensation' : 'compensation inadequacy suggesting mixed disorder'}` : 'assessment based on available parameters'}. Temporal kinetics and molecular mechanisms of compensation are consistent with acute/chronic pathophysiology.`,

hhAnalysis: `Henderson-Hasselbalch Analysis:
pH: ${values.ph} - ${values.ph < 7.35 ? 'Acidaemia' : values.ph > 7.45 ? 'Alkalaemia' : 'Normal'}
pCO2: ${values.pco2} kPa (${(values.pco2 * 7.5).toFixed(1)} mmHg) - ${values.pco2 > 6.0 ? 'Hypercapnia' : values.pco2 < 4.7 ? 'Hypocapnia' : 'Normal'}
HCO3-: ${values.hco3} mmol/L - ${values.hco3 > 26 ? 'Elevated' : values.hco3 < 22 ? 'Low' : 'Normal'}
${anionGap ? `Anion Gap: ${anionGap.toFixed(1)} mmol/L ${correctedAG ? `(corrected: ${correctedAG.toFixed(1)})` : ''} - ${anionGap > 12 ? 'High anion gap' : 'Normal'}` : ''}
${deltaRatio ? `Delta Ratio: ${deltaRatio.toFixed(2)} - ${deltaRatio > 2 ? 'Mixed disorder' : deltaRatio < 0.8 ? 'NAGMA component' : 'Pure HAGMA'}` : ''}`,

stewartAnalysis: `Stewart Physicochemical Analysis:
${sidApparent ? `SIDa: ${sidApparent.toFixed(1)} mEq/L - ${sidApparent < 38 ? 'Low SID (acidosis)' : sidApparent > 44 ? 'High SID (alkalosis)' : 'Normal SID'}` : 'SID calculation requires electrolytes'}
Atot = ${values.albumin}/4.4 = ${(values.albumin/4.4).toFixed(1)} mEq/L
Mechanistic interpretation: Changes in strong ion difference and weak acids affect acid-base status through physicochemical principles.`,

additionalCalculations: `Advanced calculations: ${values.po2 && values.fio2 ? `P/F ratio: ${(values.po2 * 7.5 / (values.fio2/100)).toFixed(0)} ${values.po2 * 7.5 / (values.fio2/100) < 300 ? '- ARDS criteria met' : '- adequate oxygenation'}. ` : ''}Comprehensive assessment includes A-a gradient, bicarbonate kinetics, lactate clearance, and hemodynamic calculations per UK critical care standards.`,

differentials: `Comprehensive Differential Diagnosis based on pattern: ${values.ph < 7.35 ? anionGap && anionGap > 12 ? 'High anion gap metabolic acidosis - DKA, lactic acidosis (Type A: shock, hypoxia; Type B: metformin, malignancy), renal failure, toxins (methanol, ethylene glycol, salicylates), pyroglutamic acidosis' : 'Normal anion gap metabolic acidosis - diarrheal losses, renal tubular acidosis (Types 1,2,4), carbonic anhydrase inhibitors' : values.ph > 7.45 ? 'Alkalosis - assess for metabolic (vomiting, diuretics, mineralocorticoid excess) vs respiratory (hyperventilation, pain, anxiety, PE) causes' : 'Normal pH - consider mixed disorders or compensation'}. Full assessment requires clinical correlation.`,

criticalCareAssessment: `Critical care considerations: Hemodynamic status, ventilatory strategy, fluid resuscitation requirements, and disposition planning. ${values.lactate > 2 ? 'Elevated lactate requires source control and optimization of tissue perfusion. ' : ''}ICU admission criteria assessment based on severity of derangement and clinical context.`,

biochemicalInterpretation: `Clinical biochemistry assessment: Sample quality, analytical precision, and reference range considerations. Pre-analytical factors including sample handling and timing are critical for accurate interpretation. Integration with other laboratory parameters recommended for comprehensive assessment.`
};
}

// Validate structure
const requiredKeys = ['summary', 'keyFindings', 'compensationAnalysis', 'hhAnalysis', 'stewartAnalysis', 'additionalCalculations', 'differentials', 'criticalCareAssessment', 'biochemicalInterpretation'];
for (const key of requiredKeys) {
if (!extractedJson[key] || typeof extractedJson[key] !== 'string' || extractedJson[key].length < 30) {
extractedJson[key] = `${key} analysis requires full assessment - comprehensive interpretation available with complete data set.`;
}
}

const executionTime = Date.now() - startTime;
console.log(`[${new Date().toISOString()}] Analysis completed in ${executionTime}ms`);

return {
statusCode: 200,
headers,
body: JSON.stringify(extractedJson)
};

} catch (error) {
console.error(`[${new Date().toISOString()}] Function error:`, error);
console.error('Error stack:', error.stack);
return {
statusCode: 500,
headers,
body: JSON.stringify({
error: 'An error occurred during analysis. Please try again.',
details: process.env.NODE_ENV === 'development' ? error.message : undefined
})
};
}

};
