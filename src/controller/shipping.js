const express = require('express');
const router = express.Router();
const logger = require('../logger');

String.prototype.isNumber = function() {
  return /^\d*\.?\d+$/.test(this);
};

Number.prototype.myRound = function(qtd) {
  return parseFloat(this.toFixed(qtd));
};

function validation(params) {
  const weight = params.weight;
  const carrier = params.carrier;
  const invoice_amount = params.invoice_amount;
  const zip_code = params.zip_code;
  const zone_location = params.zone_location;
  const freight_weight = params.freight_weight;
  const minimum_freight_weight = params.minimum_freight_weight;
  const gris = params.gris;
  const advalorem = params.advalorem;
  const road_toll = params.road_toll;

  if (weight == null) {
    throw 'weight parameter is required';
  }
  if (!weight.isNumber()) {
    throw 'weight parameter is only numbers';
  }
  if (carrier == null) {
    throw 'carrier parameter is required';
  }
  if (invoice_amount == null) {
    throw 'invoice_amount parameter is required';
  }
  if (!invoice_amount.isNumber()) {
    throw 'invoice_amount parameter is only numbers';
  }
  if (zip_code == null && zone_location == null) {
    throw 'zip_code or zone_location parameters is required';
  }
  if (!zip_code.isNumber()) {
    throw 'zip_code parameter is only numbers';
  }
  if (zip_code.length > 8) {
    throw 'zip_code parameter have max length = 8';
  }
  return {
    carrier,
    zip_code,
    weight,
    invoice_amount,
    freight_weight,
    minimum_freight_weight,
    gris,
    advalorem,
    road_toll,
  };
}

function calc(params) {
  const freightWeight = parseFloat(params.freight_weight || process.env.FREIGHT_WEIGHT);
  const weight = parseFloat(params.weight);
  const gris = parseFloat(params.gris || process.env.GRIS);
  const invoiceAmount = parseFloat(params.invoice_amount);
  const advalorem = parseFloat(params.advalorem || process.env.ADVALOREM);
  const minimumFreightWeightAmount = parseFloat(
    params.minimum_freight_weight_amount || process.env.MINIMUM_FREIGHT_WEIGHT_AMOUNT,
  );
  const serviceAmount = parseFloat(params.service_amount || process.env.SERVICE_AMOUNT);
  const roadToll = parseFloat(params.road_toll || process.env.ROAD_TOLL);
  const freightWeightAmount = (freightWeight * weight).myRound(2);
  const grisAmount = (gris * invoiceAmount).myRound(2);
  const advaloremAmount = (advalorem * invoiceAmount).myRound(2);
  let freightTotalAmount =
    (freightWeightAmount > minimumFreightWeightAmount ? freightWeightAmount : minimumFreightWeightAmount) +
    grisAmount +
    advaloremAmount +
    roadToll +
    serviceAmount;

  freightTotalAmount = freightTotalAmount.myRound(2);

  if (!freightTotalAmount) {
    throw 'impossible to calculate';
  }

  return {
    advalorem,
    advaloremAmount,
    gris,
    grisAmount,
    freightWeight,
    freightWeightAmount,
    minimumFreightWeightAmount,
    roadToll,
    serviceAmount,
    freightTotalAmount,
  };
}

router.get('/calculate', async (req, res) => {
  try {
    const parameters = validation(req.query);
    const calculation = calc(parameters);
    logger.verbose(JSON.stringify({ parameters, calculation }));
    return res.send({ parameters, calculation });
  } catch (erro) {
    logger.error(JSON.stringify(erro));
    return res.status(500).send({ erro });
  }
});

module.exports.routers = app => app.use('/shipping', router);
