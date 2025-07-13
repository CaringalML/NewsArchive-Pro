const express = require('express');
const cors = require('cors');
const { handler } = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Convert Express request to Lambda event format
function convertToLambdaEvent(req) {
    const event = {
        httpMethod: req.method,
        path: req.path,
        rawPath: req.path,
        headers: req.headers,
        queryStringParameters: req.query,
        body: req.body,
        isBase64Encoded: false,
        requestContext: {
            http: {
                method: req.method,
                path: req.path
            },
            requestId: req.headers['x-request-id'] || 'local-request',
            stage: 'prod'
        }
    };

    // Handle multipart form data
    if (req.is('multipart/form-data')) {
        event.body = req.body;
        event.isBase64Encoded = false;
    } else if (Buffer.isBuffer(req.body)) {
        event.body = req.body.toString('base64');
        event.isBase64Encoded = true;
    } else if (typeof req.body === 'object') {
        event.body = JSON.stringify(req.body);
    } else {
        event.body = req.body;
    }

    return event;
}

// Handle all routes
app.all('*', async (req, res) => {
    try {
        const lambdaEvent = convertToLambdaEvent(req);
        const result = await handler(lambdaEvent);
        
        // Set response headers
        if (result.headers) {
            Object.entries(result.headers).forEach(([key, value]) => {
                res.set(key, value);
            });
        }
        
        // Send response
        res.status(result.statusCode || 200);
        
        if (result.body) {
            try {
                const bodyObj = JSON.parse(result.body);
                res.json(bodyObj);
            } catch (e) {
                res.send(result.body);
            }
        } else {
            res.end();
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`NewsArchivePro server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;