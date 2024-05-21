const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const { XMLParser } = require('fast-xml-parser');

const app = express();
const port = 3002;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.use('/styles', express.static(path.join(__dirname, '../../')));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/consume', (req, res) => {
    try {
        const samlResponse = Buffer.from(req.body.SAMLResponse, 'base64').toString('utf8');
        const parser = new XMLParser();
        const doc = parser.parse(samlResponse);

        console.log('Parsed SAML response:', JSON.stringify(doc, null, 2));

        const assertion = doc['samlp:Response'] && doc['samlp:Response']['saml:Assertion'];
        const subject = assertion && assertion['saml:Subject'];
        const attributeStatement = assertion && assertion['saml:AttributeStatement'];

        if (assertion && subject && attributeStatement) {
            const username = subject['saml:NameID'];
            const attribute = attributeStatement['saml:Attribute'];
            const authLevel = parseInt(attribute['saml:AttributeValue'], 10);

            req.session.username = username;
            req.session.authLevel = authLevel;

            res.redirect('/');
        } else {
            console.error('Invalid SAML response structure:', JSON.stringify(doc, null, 2));
            res.status(400).send('Invalid SAML response structure');
        }
    } catch (error) {
        console.error('Error processing SAML response:', error);
        res.status(500).send('Internal server error');
    }
});

app.get('/user-info', (req, res) => {
    if (req.session.username && req.session.authLevel !== undefined) {
        res.json({
            username: req.session.username,
            authLevel: req.session.authLevel
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

app.listen(port, () => {
    console.log(`App 1 is listening on port ${port}`);
});
