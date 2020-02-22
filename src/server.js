if (process.env.NODE_ENV !== 'PROD') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const shipping = require('./controller/shipping');
const logger = require('./logger');
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.redirect(process.env.URL_APP);
});

shipping.routers(app);

app.listen(process.env.PORT || '8080', () => {
  logger.info('WC API Shipping listening on port ' + (process.env.PORT || '8080'));
});
