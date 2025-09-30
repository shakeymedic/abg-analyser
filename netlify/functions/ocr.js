// CORRECTED OCR function with proper Gemini API integration

exports.handler = async (event) => {

const headers = {
'Content-Type': 'application/json',
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Cache-Control': 'no-store'
};

if (event.httpMethod !== 'POST') {
return {
statusCode: 405,
headers,
body: JSON.stringify({ error: 'Method not allowed' })
};
}

try {
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
console.error('GEMINI_API_KEY not configured');
return {
statusCode: 500,
headers,
body: JSON.stringify({ error: 'Configuration error' })
};
}

const { image } = JSON.parse(event.body);
if (!image) {
return {
statusCode: 400,
headers,
body: JSON.stringify({ error: 'Image data required' })
};
}

// FIXED: Use correct Gemini model name (gemini-1.5-flash instead of gemini-2.5-flash)
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

const systemPrompt = `You are a precise OCR system for blood gas analysis reports. Extract the following values from the image and return them as JSON only (no other text):

{
"ph": number (pH value, e.g., 7.35),
"pco2": number (pCO2 in kPa, e.g., 5.5),
"po2": number (pO2 in kPa, e.g., 12.0),
"hco3": number (HCO3- in mmol/L, e.g., 24),
"be": number (Base Excess in mmol/L, e.g., -2),
"sodium": number (Na+ in mmol/L, e.g., 140),
"potassium": number (K+ in mmol/L, e.g., 4.0),
"chloride": number (Cl- in mmol/L, e.g., 102),
"lactate": number (Lactate in mmol/L, e.g., 1.5),
"glucose": number (Glucose in mmol/L, e.g., 5.5),
"albumin": number (Albumin in g/L, e.g., 40),
"calcium": number (Ca2+ in mmol/L, e.g., 2.25),
"hb": number (Haemoglobin in g/L, e.g., 120)
}

Return only the JSON object with extracted values. Set to null for values not found.

Common unit conversions:
- pCO2: if in mmHg, divide by 7.5 to get kPa
- pO2: if in mmHg, divide by 7.5 to get kPa
- Glucose: if in mg/dL, divide by 18 to get mmol/L`;

// Extract base64 data properly
let base64Data = image;
if (image.startsWith('data:')) {
base64Data = image.split(',')[1];
}

const requestData = {
contents: [{
parts: [{
text: systemPrompt
}, {
inline_data: {
mime_type: 'image/jpeg',
data: base64Data
}
}]
}],
generationConfig: {
temperature: 0.1,
maxOutputTokens: 1000
}
};

console.log('Sending OCR request to Gemini API');

const response = await fetch(apiUrl, {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(requestData)
});

if (!response.ok) {
const errorText = await response.text();
console.error('Gemini API error:', errorText);
console.error('API URL:', apiUrl.replace(apiKey, 'REDACTED'));
return {
statusCode: 500,
headers,
body: JSON.stringify({ 
error: 'OCR processing failed',
details: process.env.NODE_ENV === 'development' ? errorText : undefined
})
};
}

const data = await response.json();
console.log('Gemini API response received:', JSON.stringify(data).substring(0, 200));

const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

if (!extractedText) {
console.error('No text extracted from Gemini response');
console.error('Full response:', JSON.stringify(data));
return {
statusCode: 500,
headers,
body: JSON.stringify({ error: 'Failed to extract text from image' })
};
}

console.log('Raw extracted text:', extractedText);

// Parse JSON from the extracted text
let values;
try {
// Clean up the response to extract JSON
let cleanedText = extractedText.trim();
// Remove any markdown code blocks
cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
// Find JSON boundaries
const jsonStart = cleanedText.indexOf('{');
const jsonEnd = cleanedText.lastIndexOf('}') + 1;

if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
cleanedText = cleanedText.substring(jsonStart, jsonEnd);
}

values = JSON.parse(cleanedText);
console.log('Parsed values:', values);
} catch (parseError) {
console.error('JSON parsing failed:', parseError);
console.error('Cleaned text was:', cleanedText);
// Return empty values if parsing fails
values = {
ph: null,
pco2: null,
po2: null,
hco3: null,
be: null,
sodium: null,
potassium: null,
chloride: null,
lactate: null,
glucose: null,
albumin: null,
calcium: null,
hb: null
};
}

return {
statusCode: 200,
headers,
body: JSON.stringify({
success: true,
values: values,
extractedText: extractedText // Include for debugging
})
};

} catch (error) {
console.error('OCR function error:', error);
console.error('Error stack:', error.stack);
return {
statusCode: 500,
headers,
body: JSON.stringify({ 
error: 'Internal server error',
details: process.env.NODE_ENV === 'development' ? error.message : undefined
})
};
}

};
