const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const xmlbuilder = require('xmlbuilder');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

const app = express();
const port = 5005;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const users = {
    'user1': { password: 'password1', level: 1 },
    'user2': { password: 'password2', level: 2 },
    'user3': { password: 'password3', level: 3 }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landingPage', 'landingPage.html'));
});

app.get('/idp', (req, res) => {
    res.sendFile(path.join(__dirname, 'IdProvider', 'IdP.html'));
});

app.post('/login', (req, res) => {
    const { username, password, target } = req.body;
    const user = users[username];

    if (user && user.password === password) {
        const samlResponse = xmlbuilder.create('samlp:Response', { version: '1.0', encoding: 'UTF-8' })
            .att('Version', '2.0')
            .att('ID', '_someID')
            .att('IssueInstant', new Date().toISOString())
            .att('xmlns:samlp', 'urn:oasis:names:tc:SAML:2.0:protocol')
            .att('xmlns:saml', 'urn:oasis:names:tc:SAML:2.0:assertion')
            .ele('saml:Assertion', { 'ID': '_anotherID', 'IssueInstant': new Date().toISOString(), 'Version': '2.0' })
                .ele('saml:Issuer', 'http://localhost:5005')
                .up()
                .ele('saml:Subject')
                    .ele('saml:NameID', username)
                    .up()
                .up()
                .ele('saml:AttributeStatement')
                    .ele('saml:Attribute', { 'Name': 'authLevel' })
                        .ele('saml:AttributeValue', user.level.toString())
                    .up()
                .up()
            .up()
            .end({ pretty: true });

        console.log(`Generated SAML response for ${username}: ${samlResponse}`);

        fs.readFile(path.join(__dirname, 'IdProvider', 'samlResponse.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading samlResponse.html:', err);
                res.status(500).send('Internal server error');
                return;
            }

            const updatedHtml = data.replace('{{target}}', target).replace('{{samlResponse}}', Buffer.from(samlResponse).toString('base64'));
            res.send(updatedHtml);
        });
    } else {
        res.status(401).send('Invalid username or password');
    }
});

app.post('/consume', (req, res) => {
    try {
        const samlResponse = Buffer.from(req.body.SAMLResponse, 'base64').toString('utf8');
        const parser = new XMLParser();
        const doc = parser.parse(samlResponse);

        console.log('Parsed SAML response:', JSON.stringify(doc, null, 2));

        if (doc['samlp:Response'] && 
            doc['samlp:Response']['saml:Assertion'] && 
            doc['samlp:Response']['saml:Assertion']['saml:Subject'] && 
            doc['samlp:Response']['saml:Assertion']['saml:AttributeStatement']) {
            const username = doc['samlp:Response']['saml:Assertion']['saml:Subject']['saml:NameID'];
            const authLevel = parseInt(doc['samlp:Response']['saml:Assertion']['saml:AttributeStatement']['saml:Attribute']['saml:AttributeValue'], 10);

            req.session.username = username;
            req.session.authLevel = authLevel;

            res.redirect('/');
        } else {
            console.error('Invalid SAML response structure:', doc);
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
    console.log(`Server running on port ${port}`);
});
