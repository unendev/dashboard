import { convertToModelMessages, convertToCoreMessages } from 'ai';

// Mock the effective input we were trying to send initially
const initialStyleInput: any = [
    {
        role: 'user',
        content: 'Describe this image',
        experimental_attachments: [
            {
                url: 'https://example.com/test.png',
                contentType: 'image/png',
                name: 'test.png'
            }
        ]
    }
];

// Mock the "standard" content array input we tried later
const contentArrayStyleInput: any = [
    {
        role: 'user',
        content: [
            { type: 'text', text: 'Describe this image' },
            { type: 'image', image: new URL('https://example.com/test.png') }
        ]
    }
];

// Mock string URL in content array
const stringUrlStyleInput: any = [
    {
        role: 'user',
        content: [
            { type: 'text', text: 'Describe this image' },
            { type: 'image', image: 'https://example.com/test.png' }
        ]
    }
];

async function runTests() {
    console.log('--- TEST 1: initialStyleInput (experimental_attachments) ---');
    try {
        // @ts-ignore
        const result1 = convertToModelMessages(initialStyleInput);
        console.log('convertToModelMessages Result:', JSON.stringify(result1, null, 2));

        try {
            const coreResult1 = convertToCoreMessages(initialStyleInput);
            console.log('convertToCoreMessages Result:', JSON.stringify(coreResult1, null, 2));
        } catch (e: any) { console.log('convertToCoreMessages Error:', e.message); }

    } catch (e) {
        console.error('Error:', e);
    }

    console.log('\n--- TEST 2: contentArrayStyleInput (URL object) ---');
    try {
        // @ts-ignore
        const result2 = convertToModelMessages(contentArrayStyleInput);
        console.log('convertToModelMessages Result:', JSON.stringify(result2, null, 2));

        try {
            const coreResult2 = convertToCoreMessages(contentArrayStyleInput);
            console.log('convertToCoreMessages Result:', JSON.stringify(coreResult2, null, 2));
        } catch (e: any) { console.log('convertToCoreMessages Error:', e.message); }
    } catch (e) {
        console.error('Error:', e);
    }

    console.log('\n--- TEST 3: stringUrlStyleInput (String URL) ---');
    try {
        // @ts-ignore
        const result3 = convertToModelMessages(stringUrlStyleInput);
        console.log('convertToModelMessages Result:', JSON.stringify(result3, null, 2));

        try {
            const coreResult3 = convertToCoreMessages(stringUrlStyleInput);
            console.log('convertToCoreMessages Result:', JSON.stringify(coreResult3, null, 2));
        } catch (e: any) { console.log('convertToCoreMessages Error:', e.message); }
    } catch (e) {
        console.error('Error:', e);
    }
}

runTests();
