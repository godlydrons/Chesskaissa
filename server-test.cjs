const express = require('express');
const app = express();
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/test-sf-worker.html'));
app.listen(3002, () => console.log('Listening on 3002'));
