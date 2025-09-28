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
if (!values || typeof values.ph !== 'number' || typeof values.pco2 !== 'number') {
return {
statusCode: 400,
headers,
body: JSON.stringify({
error: 'Invalid input. pH and pCO₂ are required.'
})
};
}

// Use Perplexity API with ULTRA-ENHANCED system prompt for consultant-level analysis
const apiUrl = 'https://api.perplexity.ai/chat/completions';

// ULTRA-ENHANCED SYSTEM PROMPT - Consultant Emergency Medicine + ICU + Clinical Biochemistry
const systemPrompt = `You are a senior consultant providing ultra-sophisticated blood gas interpretation for UK emergency medicine, intensive care medicine, and clinical biochemistry specialists. Your analysis must match the depth expected by consultant emergency physicians, intensive care consultants, and consultant clinical biochemists.

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY a valid JSON object
- NO markdown formatting, NO code blocks, NO explanatory text outside JSON
- Start response with { and end with }
- Provide EXCEPTIONAL clinical depth matching senior consultant expertise
- Use cutting-edge understanding of acid-base physiology, critical care pathophysiology, and clinical biochemistry
- Follow latest UK guidelines: NICE, BTS, ICS, RCP, ACEP, ESICM standards
- Include extensive differential diagnoses with detailed clinical reasoning

REQUIRED JSON STRUCTURE (ALL keys mandatory):
{
"summary": "string (150-200 words)",
"keyFindings": "string (600-800 words)",
"compensationAnalysis": "string (500-700 words)",
"hhAnalysis": "string (detailed structured format with advanced calculations)",
"stewartAnalysis": "string (detailed structured format with quantitative assessment)",
"additionalCalculations": "string (400-600 words)",
"differentials": "string (800-1200 words with extensive differential list)",
"criticalCareAssessment": "string (400-600 words)",
"biochemicalInterpretation": "string (400-600 words)"
}

ENHANCED SECTION SPECIFICATIONS:

"summary" (150-200 words):
Brief executive summary for immediate clinical use including:
- Overall acid-base status in one sentence
- Any immediately critical findings requiring urgent intervention
- Most likely primary diagnosis with confidence level
- Key risk factors and immediate priorities
- Disposition recommendation (ward/HDU/ITU)

"keyFindings" (600-800 words):
- Ultra-detailed pathophysiological mechanisms at molecular and cellular level
- Sophisticated risk stratification using multiple severity scoring systems
- Integration with hemodynamic, respiratory, and metabolic physiology
- Complex acid-base interactions including buffer system kinetics
- Detailed discussion of compensatory mechanisms including temporal dynamics
- Advanced clinical correlations with multi-organ system involvement
- Precise prognostic indicators with quantitative risk assessment
- Integration of acute phase responses and inflammatory mediators where relevant
- Discussion of pharmacokinetic/pharmacodynamic implications
- Detailed assessment of therapeutic windows and intervention priorities

"compensationAnalysis" (500-700 words):
- Ultra-sophisticated analysis of primary vs secondary vs tertiary disorders
- Detailed temporal analysis of compensation kinetics and sustainability
- Advanced mathematical modeling of expected compensation using multiple formulae
- Cellular and molecular mechanisms of renal and respiratory compensation
- Assessment of compensation failure patterns and clinical implications
- Integration with cardiovascular and hemodynamic status
- Discussion of mixed disorders with quantitative deconvolution
- Analysis of compensation adequacy using advanced physiological principles
- Prediction of decompensation patterns and intervention timing
- Assessment of respiratory muscle mechanics and ventilatory reserve

"hhAnalysis":
"Henderson-Hasselbalch Ultra-Advanced Analysis

pH: [value] (7.35-7.45) - [Ultra-detailed pathophysiological interpretation with molecular mechanisms]
pCO2: [value] kPa ([mmHg] mmHg) (4.7-6.0 kPa or 35-45 mmHg) - [Sophisticated ventilatory mechanics analysis with V/Q relationships]
HCO3-: [value] mmol/L (22-26 mmol/L) - [Detailed buffer system kinetics and renal handling mechanisms]
Base Excess: [value] mmol/L (-2 to +2 mmol/L) - [Advanced buffer base analysis with total body buffer assessment]

Advanced Pathophysiological Assessment:
[Ultra-detailed molecular and cellular mechanisms driving the disorder]
[Sophisticated analysis of enzyme kinetics, membrane transport, and metabolic pathways]
[Integration with neuroendocrine responses and acute phase reactions]

Quantitative Buffer Analysis:
[Detailed assessment of bicarbonate, phosphate, protein, and hemoglobin buffers]
[Analysis of intracellular vs extracellular buffering capacity]
[Assessment of buffer system interactions and kinetic limitations]

Mathematical Verification Suite:
Anion Gap = [Na+] - ([Cl-] + [HCO3-]) = [calculation] = [result] mmol/L (8-12 mmol/L)
Corrected AG = AG + 0.25×(40-[Albumin]) = [calculation] = [result] mmol/L
Delta Ratio = (AG-12)/(24-HCO3) = [calculation] = [result]
Expected Osmolality = 2×[Na+] + [Glucose] + [Urea] = [calculation] mOsm/kg
Osmolar Gap = Measured - Expected = [calculation] mOsm/kg

Advanced Diagnostic Calculations:
[Include UAG, FENa, TTKG, corrected calcium, phosphate handling where relevant]

Critical Care Integration:
[Discussion of hemodynamic implications, ventilatory requirements, renal replacement therapy indications]"

"stewartAnalysis":
"Stewart Physicochemical Ultra-Advanced Analysis

Quantitative Independent Variables:
Strong Ion Difference (SIDa) = [Na+] + [K+] + [Ca2+] + [Mg2+] - [Cl-] - [Lactate] = [calculation] = [result] mEq/L (40±2)
Total Weak Acids (Atot) = [Albumin]/4.4 + [Phosphate] = [calculation] = [result] mEq/L
pCO2 = [value] kPa (independent variable)

Dependent Variables Analysis:
pH (dependent) = 6.1 + log([HCO3-]/0.03×pCO2) = [verification calculation]
HCO3- (dependent) = Function of SID, Atot, pCO2 per Stewart equations
[H+] = Function of three independent variables per physicochemical principles

Advanced Mechanistic Interpretation:
[Ultra-detailed explanation of how changes in SID affect [H+] and pH]
[Sophisticated analysis of weak acid effects on acid-base balance]
[Quantitative assessment of CO2 effects independent of bicarbonate]
[Integration with cellular ion transport and membrane physiology]

Strong Ion Gap Analysis:
SIDe = [HCO3-] + [Albumin charge] + [Phosphate charge] + [Other weak acids]
SIG = SIDa - SIDe = [calculation] = [result] mEq/L
[Detailed analysis of unmeasured ions and their clinical significance]

Therapeutic Implications:
[How Stewart analysis guides specific interventions]
[Quantitative predictions of therapy effects on acid-base status]"

"additionalCalculations" (400-600 words):
Ultra-advanced calculation suite including:
- P/F ratio with ARDS classification and ventilatory strategy implications
- A-a gradient with age correction and V/Q mismatch quantification
- Shunt fraction calculation and optimization strategies
- FiO2 requirements prediction and escalation pathways
- Bicarbonate space of distribution and replacement kinetics
- Lactate clearance kinetics and prognostic implications
- Renal replacement therapy efficiency calculations
- Hemodynamic calculations (SVR, PVR, cardiac output estimation)
- Metabolic rate calculations and nutritional implications
- Pharmacokinetic modifications based on acid-base status

"differentials" (800-1200 words):
Provide EXTENSIVE consultant-level differential diagnosis covering ALL possibilities:

"Comprehensive Differential Diagnosis

PRIMARY METABOLIC ACIDOSIS DIFFERENTIALS:
High Anion Gap (HAGMA):
• Diabetic Ketoacidosis - [Detailed pathophysiology and diagnostic criteria]
• Starvation/Alcoholic Ketoacidosis - [Mechanistic differences and clinical pearls]
• Lactic Acidosis Type A (Tissue Hypoxia) - [Subtypes: shock, hypoxemia, severe anemia, CO poisoning]
• Lactic Acidosis Type B (Non-hypoxic) - [Metformin, nucleoside analogues, malignancy, seizures]
• Renal Failure (Acute/Chronic) - [Retention of organic acids, phosphates, sulfates]
• Toxic Ingestions:
  - Methanol → Formic acid → Retinal toxicity, basal ganglia necrosis
  - Ethylene glycol → Glycolic/Oxalic acid → Renal failure, CNS toxicity
  - Salicylates → Uncoupling oxidative phosphorylation, direct CNS effects
  - Isoniazid → GABA antagonism, lactate production
  - Iron → Mitochondrial toxicity, cellular hypoxia
• Pyroglutamic Acidosis - [Paracetamol, sepsis, malnutrition interactions]
• D-Lactic Acidosis - [Short gut syndrome, bacterial overgrowth]
• Propylene Glycol - [IV medications, prolonged infusions]

Normal Anion Gap (NAGMA):
• Diarrheal Losses - [Secretory vs osmotic, ion transport mechanisms]
• Renal Tubular Acidosis:
  - Type 1 (Distal) → Distal H+ secretion defects
  - Type 2 (Proximal) → Proximal HCO3- reabsorption defects  
  - Type 4 (Hyperkalemic) → Aldosterone deficiency/resistance
• Urinary Diversions - [Ureterosigmoidostomy, ileal conduit]
• Carbonic Anhydrase Inhibitors - [Acetazolamide, topiramate]
• Hyperalimentation - [Amino acid metabolism, chloride content]
• Recovery from Ketoacidosis - [Ketone excretion without bicarbonate]

RESPIRATORY ACIDOSIS DIFFERENTIALS:
Acute Respiratory Acidosis:
• Central Nervous System Depression:
  - Drug Overdose → Opioids, benzodiazepines, barbiturates, alcohol
  - CNS Infections → Encephalitis, meningitis
  - CNS Trauma → Brainstem injury, raised ICP
  - Cerebrovascular → Stroke affecting respiratory centres
• Neuromuscular Disorders:
  - Acute → Guillain-Barré, myasthenia gravis crisis, botulism
  - Toxic → Organophosphate, paralytic agents
• Chest Wall/Pleural:
  - Pneumothorax → Tension pneumothorax, bilateral pneumothoraces
  - Chest trauma → Flail chest, massive hemothorax
• Airway Obstruction:
  - Upper → Foreign body, laryngospasm, angioedema
  - Lower → Severe asthma, COPD exacerbation

Chronic Respiratory Acidosis:
• COPD - [Advanced pathophysiology and phenotype analysis]
• Restrictive Lung Disease - [Pulmonary fibrosis, chest wall deformities]
• Neuromuscular Disorders - [ALS, muscular dystrophy, spinal cord injury]
• Sleep-Disordered Breathing - [Obesity hypoventilation, central sleep apnea]

METABOLIC ALKALOSIS DIFFERENTIALS:
Chloride-Responsive (<20 mmol/L urine Cl-):
• Volume Depletion:
  - GI Losses → Vomiting, NG suction, congenital chloridorrhea
  - Prior Diuretic Use → Loop, thiazide effects
• Post-Hypercapnic State - [Rapid correction of chronic respiratory acidosis]

Chloride-Resistant (>20 mmol/L urine Cl-):
• Mineralocorticoid Excess:
  - Primary Hyperaldosteronism → Conn's syndrome, bilateral hyperplasia
  - Secondary Hyperaldosteronism → Renovascular disease, renin tumors
  - Other Mineralocorticoids → Cortisol, fludrocortisone, licorice
• Genetic Syndromes:
  - Bartter Syndrome → Loop transporter defects
  - Gitelman Syndrome → Thiazide-sensitive transporter defects
• Severe Hypokalemia → Any cause <2.5 mmol/L
• Milk-Alkali Syndrome → Calcium carbonate ingestion

RESPIRATORY ALKALOSIS DIFFERENTIALS:
• CNS Stimulation:
  - Anxiety/Panic → Psychiatric, situational
  - Pain → Acute, chronic pain syndromes  
  - Fever → Infectious, inflammatory, neoplastic
  - CNS Lesions → Tumor, trauma, infection
• Pulmonary Disease:
  - Pulmonary Embolism → Acute, chronic thromboembolic disease
  - Pneumonia → Bacterial, viral, atypical
  - Pulmonary Edema → Cardiogenic, non-cardiogenic
  - Interstitial Disease → Acute, progressive fibrosis
• Systemic Conditions:
  - Sepsis → Early hyperventilation phase
  - Hepatic Failure → Hyperammonemia effects
  - Salicylate Toxicity → Direct respiratory centre stimulation
  - Hyperthyroidism → Increased metabolic rate
• Mechanical Ventilation → Inappropriate settings, anxiety response

MIXED DISORDERS:
• Detailed analysis of complex combinations with quantitative deconvolution
• Assessment of dominant vs minor components
• Temporal evolution patterns and intervention priorities

RARE BUT IMPORTANT DIFFERENTIALS:
[Include zebras that critical care specialists should consider]
• Inborn Errors of Metabolism
• Mitochondrial Disorders
• 5-Oxoprolinuria
• Massive Blood Transfusion Effects
• Hyperchloremic Acidosis from Resuscitation Fluids"

"criticalCareAssessment" (400-600 words):
Ultra-sophisticated critical care evaluation including:
- Hemodynamic implications and cardiovascular effects
- Ventilatory strategy optimization and weaning predictions
- Renal replacement therapy indications and modality selection
- Fluid and electrolyte management strategies
- Vasoactive drug effects and acid-base interactions
- Nutritional implications and metabolic cart interpretations
- Multi-organ dysfunction syndrome risk assessment
- ICU scoring system integration (APACHE, SOFA, SAPS)
- Liberation protocols and mobility considerations
- Family communication and ethical considerations

"biochemicalInterpretation" (400-600 words):
Expert clinical biochemist perspective including:
- Advanced analytical considerations and method validation
- Pre-analytical variables and sample quality assessment
- Reference interval derivation and population-specific considerations
- Analytical interference identification and mitigation strategies
- Quality control implications and measurement uncertainty
- Method comparison and harmonization considerations
- Biological variation and critical difference calculations
- Point-of-care vs laboratory analysis optimization
- Integration with other biochemical markers and panels
- Interpretive algorithms and decision support systems

CRITICAL: Every section must demonstrate EXCEPTIONAL clinical depth, sophisticated understanding, and consultant-level expertise appropriate for UK emergency medicine, intensive care medicine, and clinical biochemistry practice.`;

// Build ultra-enhanced analysis request
const analysisValues = { ...values };
// Assume normal values if not provided for comprehensive analysis
if (!analysisValues.albumin || isNaN(analysisValues.albumin)) {
analysisValues.albumin = 40;
}

// Convert units and build ultra-detailed structured prompt
const pco2_mmHg = (analysisValues.pco2 * 7.5).toFixed(1);
const po2_mmHg = analysisValues.po2 ? (analysisValues.po2 * 7.5).toFixed(1) : null;

let prompt = `ULTRA-SOPHISTICATED BLOOD GAS ANALYSIS REQUEST
For Consultant Emergency Medicine, Intensive Care Medicine, and Clinical Biochemistry Specialists

CLINICAL CONTEXT:
Patient History: ${clinicalHistory || 'Not provided - require comprehensive differential assessment'}
Sample Type: ${sampleType || 'Arterial'}
Analysis Level: Consultant-level interpretation required`;

// Ultra-detailed laboratory section
prompt += `

COMPREHENSIVE LABORATORY VALUES:

Primary Gas Exchange Parameters:
• pH: ${analysisValues.ph} [Critical acid-base status determinant]
• pCO2: ${analysisValues.pco2} kPa (${pco2_mmHg} mmHg) [Respiratory component and ventilatory status]`;

if (analysisValues.po2) {
prompt += `
• pO2: ${analysisValues.po2} kPa (${po2_mmHg} mmHg) [Oxygenation status and V/Q assessment]`;
}

if (analysisValues.hco3) {
prompt += `
• HCO3-: ${analysisValues.hco3} mmol/L [Metabolic component and renal handling]`;
}

if (analysisValues.be !== null && analysisValues.be !== undefined) {
prompt += `
• Base Excess: ${analysisValues.be} mmol/L [Total body buffer base assessment]`;
}

// Enhanced electrolyte section
if (analysisValues.sodium || analysisValues.potassium || analysisValues.chloride) {
prompt += `

Electrolyte Panel for Stewart Analysis:`;
if (analysisValues.sodium) prompt += `
• Na+: ${analysisValues.sodium} mmol/L [Strong ion - primary SID component]`;
if (analysisValues.potassium) prompt += `
• K+: ${analysisValues.potassium} mmol/L [Strong ion - SID component and cellular effects]`;
if (analysisValues.chloride) prompt += `
• Cl-: ${analysisValues.chloride} mmol/L [Strong ion - primary SID component]`;
}

// Comprehensive biochemical profile
prompt += `

Advanced Biochemical Parameters:
• Albumin: ${analysisValues.albumin} g/L${!values.albumin ? ' (assumed for calculation purposes)' : ''} [Weak acid - Atot component]`;

if (analysisValues.lactate) {
prompt += `
• Lactate: ${analysisValues.lactate} mmol/L [Tissue perfusion marker and strong ion]`;
}

if (analysisValues.glucose) {
prompt += `
• Glucose: ${analysisValues.glucose} mmol/L [Metabolic status and osmolality contributor]`;
}

if (analysisValues.calcium) {
prompt += `
• Ca2+: ${analysisValues.calcium} mmol/L [Strong ion - SID component and physiological effects]`;
}

if (analysisValues.hb) {
prompt += `
• Hemoglobin: ${analysisValues.hb} g/L [Oxygen carrying capacity and buffer]`;
}

prompt += `

ULTRA-SOPHISTICATED ANALYSIS REQUIREMENTS:
1. Provide consultant-level interpretation matching expertise of senior emergency medicine consultants, intensive care consultants, and consultant clinical biochemists
2. Include ultra-detailed pathophysiological mechanisms at molecular and cellular level
3. Perform comprehensive Henderson-Hasselbalch AND Stewart physicochemical analysis with advanced calculations
4. Provide extensive differential diagnoses covering ALL possibilities with detailed clinical reasoning
5. Include critical care assessment with hemodynamic, ventilatory, and multi-organ considerations
6. Provide expert clinical biochemistry interpretation including analytical and pre-analytical considerations
7. Follow latest UK guidelines: NICE, BTS, ICS, RCP, ESICM standards
8. Include quantitative risk assessment and sophisticated prognostic indicators
9. Demonstrate mastery of complex acid-base physiology and therapeutic implications
10. Provide ultra-detailed therapeutic recommendations with intervention timing and monitoring strategies

Return comprehensive analysis following the exact JSON structure specified for UK consultant-level practice.`;

const requestPayload = {
model: 'sonar-pro',
messages: [
{
role: 'system',
content: systemPrompt
},
{
role: 'user', 
content: prompt
}
],
temperature: 0.05, // Even lower for maximum clinical consistency
max_tokens: 12000  // Increased for ultra-detailed analysis
};

console.log(`[${new Date().toISOString()}] Sending ultra-sophisticated consultant-level analysis to Perplexity API`);

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

// Enhanced JSON parsing for ultra-detailed response
let extractedJson;
try {
// Clean response - remove any markdown or extra text
let cleaned = responseText.trim();
cleaned = cleaned.replace(/```json\s*/gi, '');
cleaned = cleaned.replace(/```\s*/g, '');

// Find JSON boundaries more precisely
const firstBrace = cleaned.indexOf('{');
const lastBrace = cleaned.lastIndexOf('}');

if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
cleaned = cleaned.substring(firstBrace, lastBrace + 1);
cleaned = cleaned.replace(/,\s*}/g, '}');
cleaned = cleaned.replace(/,\s*]/g, ']');
extractedJson = JSON.parse(cleaned);
console.log('Ultra-detailed JSON parsed successfully');
} else {
throw new Error('No valid JSON structure found');
}

} catch (parseError) {
console.error('JSON parsing failed:', parseError.message);
console.error('Response sample:', responseText.substring(0, 500));

// Ultra-enhanced fallback with sophisticated calculations
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
summary: `Consultant-level analysis reveals ${values.ph < 7.35 ? 'significant acidaemia' : values.ph > 7.45 ? 'alkalemia' : 'normal pH'} requiring immediate attention per UK emergency medicine standards. ${values.lactate > 4 ? 'Critical lactate elevation indicating tissue hypoxia. ' : ''}Primary disorder assessment and comprehensive differential diagnosis pending full ultra-detailed consultant-level analysis - please retry for complete interpretation.`,

keyFindings: `Ultra-sophisticated analysis reveals ${values.ph < 7.35 ? 'significant acidaemia' : values.ph > 7.45 ? 'alkalemia' : 'normal pH'} requiring consultant-level interpretation per UK emergency medicine, intensive care, and clinical biochemistry standards. pH ${values.ph} with detailed pathophysiological implications including molecular mechanisms, buffer system kinetics, and multi-organ effects. ${values.lactate > 4 ? 'CRITICAL lactate elevation indicating tissue hypoxia with cellular metabolic dysfunction' : ''}. Comprehensive risk stratification and therapeutic window assessment pending full consultant-level analysis - please retry for complete ultra-detailed interpretation matching senior consultant expertise.`,

compensationAnalysis: `Ultra-sophisticated compensation analysis reveals ${values.hco3 && wintersLow ? `Winter's formula expected pCO2 ${wintersLow}-${wintersHigh} mmHg vs actual ${(values.pco2 * 7.5).toFixed(1)} mmHg indicating ${Math.abs((values.pco2 * 7.5) - (1.5 * values.hco3 + 8)) < 4 ? 'appropriate respiratory compensation with intact respiratory center function' : 'compensation inadequacy suggesting mixed disorder or respiratory pathology'}` : 'compensation assessment pending'}. Detailed temporal kinetics, molecular mechanisms of renal and respiratory compensation, and decompensation risk assessment require full ultra-detailed analysis - please retry for complete consultant-level interpretation.`,

hhAnalysis: `Henderson-Hasselbalch Ultra-Advanced Analysis:
pH: ${values.ph} - ${values.ph < 7.35 ? 'Severe acidaemia with molecular buffer system depletion' : values.ph > 7.45 ? 'Alkalemia with buffer system alkalinization' : 'Normal with detailed buffer analysis required'}
pCO2: ${values.pco2} kPa (${(values.pco2 * 7.5).toFixed(1)} mmHg) - ${values.pco2 > 6.0 ? 'Hypercapnia with ventilatory implications' : values.pco2 < 4.7 ? 'Hypocapnia with respiratory alkalosis' : 'Normal range'}
${values.hco3 ? `HCO3-: ${values.hco3} mmol/L - ${values.hco3 > 26 ? 'Metabolic alkalosis component' : values.hco3 < 22 ? 'Metabolic acidosis component' : 'Normal bicarbonate'}` : ''}
${anionGap ? `Anion Gap: ${anionGap} mmol/L ${correctedAG ? `(corrected: ${correctedAG.toFixed(1)} mmol/L)` : ''} - ${anionGap > 12 ? 'High anion gap with unmeasured anions' : 'Normal anion gap'}` : ''}
${deltaRatio ? `Delta Ratio: ${deltaRatio.toFixed(2)} - ${deltaRatio > 2 ? 'Mixed disorder suspected' : deltaRatio < 0.8 ? 'NAGMA component' : 'Pure HAGMA pattern'}` : ''}
Full ultra-detailed analysis with molecular mechanisms pending - please retry.`,

stewartAnalysis: `Stewart Physicochemical Ultra-Advanced Analysis:
${sidApparent ? `Strong Ion Difference (SIDa): ${sidApparent.toFixed(1)} mEq/L - ${sidApparent < 38 ? 'Low SID contributing to acidosis' : sidApparent > 44 ? 'High SID contributing to alkalosis' : 'Normal SID'}` : 'SID calculation requires electrolytes'}
Advanced mechanistic interpretation with quantitative independent variables (SID, Atot, pCO2), dependent variables analysis, and therapeutic implications require full ultra-sophisticated analysis - please retry for complete consultant-level Stewart assessment.`,

additionalCalculations: `Ultra-Advanced Calculation Suite:
${values.po2 && values.fio2 ? `P/F ratio: ${(values.po2 * 7.5 / (values.fio2/100)).toFixed(0)} - ${values.po2 * 7.5 / (values.fio2/100) < 300 ? 'ARDS criteria with ventilatory strategy implications' : 'Adequate oxygenation'}` : ''}
Comprehensive calculations including A-a gradient, shunt fraction, bicarbonate kinetics, lactate clearance, renal replacement therapy efficiency, hemodynamic calculations, and pharmacokinetic modifications require full ultra-detailed consultant-level analysis - please retry.`,

differentials: `Ultra-Extensive Consultant-Level Differential Diagnosis:
Primary consideration based on pattern: ${values.ph < 7.35 ? anionGap && anionGap > 12 ? 'High anion gap metabolic acidosis - comprehensive differentials include DKA, lactic acidosis (Type A: shock, hypoxemia, CO poisoning; Type B: metformin, malignancy), renal failure, toxic ingestions (methanol, ethylene glycol, salicylates, iron, isoniazid), pyroglutamic acidosis, D-lactic acidosis' : 'Normal anion gap metabolic acidosis - comprehensive differentials include diarrheal losses, renal tubular acidosis (Types 1, 2, 4), urinary diversions, carbonic anhydrase inhibitors' : values.ph > 7.45 ? 'Alkalosis - comprehensive assessment for metabolic vs respiratory causes with extensive differential list' : 'Normal pH with potential mixed disorders'}
Full ultra-extensive differential diagnosis covering ALL possibilities for emergency medicine, intensive care, and clinical biochemistry practice requires complete consultant-level analysis - please retry.`,

criticalCareAssessment: `Ultra-Sophisticated Critical Care Assessment:
Hemodynamic implications with cardiovascular effects, ventilatory strategy optimization, renal replacement therapy indications, multi-organ dysfunction risk, ICU scoring integration (APACHE, SOFA), vasoactive drug considerations, and liberation protocols require full ultra-detailed critical care consultant analysis - please retry.`,

biochemicalInterpretation: `Expert Clinical Biochemistry Assessment:
Advanced analytical considerations, pre-analytical variables, reference interval applications, quality control implications, method validation, biological variation assessment, and interpretive algorithm integration require full consultant clinical biochemistry analysis - please retry for complete sophisticated interpretation.`
};
}

// Validate ultra-enhanced structure with all required keys
const requiredKeys = ['summary', 'keyFindings', 'compensationAnalysis', 'hhAnalysis', 'stewartAnalysis', 'additionalCalculations', 'differentials', 'criticalCareAssessment', 'biochemicalInterpretation'];
for (const key of requiredKeys) {
if (!extractedJson[key] || typeof extractedJson[key] !== 'string' || extractedJson[key].length < 50) {
extractedJson[key] = `Ultra-sophisticated ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} requires full consultant-level analysis - please retry for complete ${key === 'differentials' ? 'extensive differential diagnosis list' : 'detailed assessment'} matching senior consultant expertise per UK emergency medicine, intensive care, and clinical biochemistry standards.`;
}
}

const executionTime = Date.now() - startTime;
console.log(`[${new Date().toISOString()}] Ultra-sophisticated consultant-level analysis completed in ${executionTime}ms using Perplexity API`);

return {
statusCode: 200,
headers,
body: JSON.stringify(extractedJson)
};

} catch (error) {
console.error(`[${new Date().toISOString()}] Function error:`, error);
return {
statusCode: 500,
headers,
body: JSON.stringify({
error: 'An error occurred during ultra-sophisticated analysis. Please try again.',
details: process.env.NODE_ENV === 'development' ? error.message : undefined
})
};
}

};
