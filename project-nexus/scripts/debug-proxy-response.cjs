
// using native fetch

const API_KEY = process.env.GEMINI_PROXY_API_KEY || 'sk-263d3dcfe61c4c3da96d2bcbbb22dc11';
const BASE_URL_OPENAI = 'https://api.unendev.com/v1/chat/completions';
const BASE_URL_GOOGLE = 'https://api.unendev.com/v1beta/models/gemini-3-flash:streamGenerateContent';

async function testOpenAI() {
    console.log('\n--- Testing OpenAI Compatible Endpoint ---');
    try {
        const response = await fetch(BASE_URL_OPENAI, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gemini-3-flash',
                messages: [{ role: 'user', content: 'Say hello' }],
                stream: true
            })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log('Response Preview (First 500 chars):');
        console.log(text.slice(0, 500));

        if (response.status === 404) console.log('=> OpenAI endpoint not found.');
        else if (response.status === 200) console.log('=> OpenAI endpoint looks valid.');
    } catch (e) {
        console.error('OpenAI Test Failed:', e.message);
    }
}

async function testGoogle() {
    console.log('\n--- Testing Google Native Endpoint ---');
    try {
        const url = `${BASE_URL_GOOGLE}?key=${API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say hello' }] }]
            })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log('Response Preview (First 500 chars):');
        console.log(text.slice(0, 500));

        if (response.status === 404) console.log('=> Google endpoint not found.');
        else if (response.status === 200) console.log('=> Google endpoint looks valid.');
    } catch (e) {
        console.error('Google Test Failed:', e.message);
    }
}

async function run() {
    await testOpenAI();
    await testGoogle();
}

run();
