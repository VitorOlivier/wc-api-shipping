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
  const invoiceAmount = params.invoiceAmount;
  const zipCode = params.zipCode;
  const zoneLocation = params.zoneLocation;
  const freightWeight = params.freightWeight;
  const minimumFreightWeight = params.minimumFreightWeight;
  const gris = params.gris;
  const advalorem = params.advalorem;
  const roadToll = params.roadToll;

  if (!weight || 0 === weight.length) {
    throw 'weight parameter is required';
  }
  if (!weight.isNumber()) {
    throw 'weight parameter is only numbers';
  }
  if (!carrier || 0 === carrier.length) {
    throw 'carrier parameter is required';
  }
  if (!invoiceAmount || 0 === invoiceAmount.length) {
    throw 'invoiceAmount parameter is required';
  }
  if (!invoiceAmount.isNumber()) {
    throw 'invoiceAmount parameter is only numbers';
  }
  if ((!zipCode || 0 === zipCode.length) && (!zoneLocation || 0 === zoneLocation.length)) {
    throw 'zipCode or zoneLocation parameters is required';
  }
  if (!zipCode.isNumber() && !(!zipCode || 0 === zipCode.length)) {
    throw 'zipCode parameter is only numbers';
  }
  if (zipCode.length > 8) {
    throw 'zipCode parameter have max length = 8';
  }
  return {
    carrier,
    zipCode,
    zoneLocation,
    weight,
    invoiceAmount,
    freightWeight,
    minimumFreightWeight,
    gris,
    advalorem,
    roadToll,
  };
}

function calc(params) {
  const freightWeight = parseFloat(params.freightWeight || process.env.FREIGHT_WEIGHT);
  const weight = parseFloat(params.weight);
  const gris = parseFloat(params.gris || process.env.GRIS);
  const invoiceAmount = parseFloat(params.invoiceAmount);
  const advalorem = parseFloat(params.advalorem || process.env.ADVALOREM);
  const minimumFreightWeightAmount = parseFloat(
    params.minimumFreightWeightAmount || process.env.MINIMUM_FREIGHT_WEIGHT_AMOUNT,
  );
  const serviceAmount = parseFloat(params.serviceAmount || process.env.SERVICE_AMOUNT);
  const roadToll = parseFloat(params.roadToll || process.env.ROAD_TOLL);
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
