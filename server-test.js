const express = require('express');
const app = express();
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/test.html'));
app.listen(3001, () => console.log('Listening on 3001'));
