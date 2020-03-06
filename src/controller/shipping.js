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
  const country = params.country;
  const state = params.state;
  const city = params.city;
  const postalCode = params.postalCode;
  const freightWeight = params.freightWeight;
  const minFreightWeightAmount = params.minFreightWeightAmount;
  const gris = params.gris;
  const advalorem = params.advalorem;
  const roadToll = params.roadToll;
  const shippingFee = params.shippingFee;
  const icms = params.icms;

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
  if ((!postalCode || 0 === postalCode.length) && (!state || 0 === state.length)) {
    throw 'postalCode or state parameters is required';
  }
  if (!postalCode.isNumber() && !(!postalCode || 0 === postalCode.length)) {
    throw 'postalCode parameter is only numbers';
  }
  if (postalCode.length > 8) {
    throw 'postalCode parameter have max length = 8';
  }
  return {
    carrier,
    country,
    state,
    city,
    postalCode,
    weight,
    invoiceAmount,
    freightWeight,
    minFreightWeightAmount,
    gris,
    advalorem,
    roadToll,
    shippingFee,
    icms,
  };
}

function calc(params) {
  const freightWeight = parseFloat(params.freightWeight || process.env.FREIGHT_WEIGHT);
  const weight = parseFloat(params.weight);
  const gris = parseFloat(params.gris || process.env.GRIS);
  const invoiceAmount = parseFloat(params.invoiceAmount);
  const advalorem = parseFloat(params.advalorem || process.env.ADVALOREM);
  const minFreightWeightAmount = parseFloat(params.minFreightWeightAmount || process.env.MIN_FREIGHT_WEIGHT_AMOUNT);
  const shippingFee = parseFloat(params.shippingFee || process.env.SHIPPING_FEE);
  const roadToll = parseFloat(params.roadToll || process.env.ROAD_TOLL);
  const roadTollAmount = (roadToll * Math.ceil(weight / 100)).myRound(2);
  const icms = parseFloat(params.icms || process.env.ICMS);
  const freightWeightAmount = (freightWeight * weight).myRound(2);
  const grisAmount = (gris * invoiceAmount).myRound(2);
  const advaloremAmount = (advalorem * invoiceAmount).myRound(2);
  let freightTotalAmount =
    (freightWeightAmount > minFreightWeightAmount ? freightWeightAmount : minFreightWeightAmount) +
    grisAmount +
    advaloremAmount +
    roadTollAmount +
    shippingFee;

  const icmsAmount = ((freightTotalAmount / (1 - icms)) * icms).myRound(2);
  freightTotalAmount = (freightTotalAmount + icmsAmount).myRound(2);

  return {
    shippingFee,
    advalorem,
    advaloremAmount,
    gris,
    grisAmount,
    freightWeight,
    freightWeightAmount,
    minFreightWeightAmount,
    roadToll,
    roadTollAmount,
    icms,
    icmsAmount,
    freightTotalAmount,
  };
}

router.get('/calculate', async (req, res) => {
  try {
    const parameters = validation(req.query);
    const calculation = calc(parameters);
    logger.verbose(JSON.stringify({ parameters, calculation }));
    if (!calculation.freightTotalAmount) {
      throw 'impossible to calculate';
    }
    return res.send({ parameters, calculation });
  } catch (erro) {
    logger.error(JSON.stringify(erro));
    return res.status(500).send({ erro });
  }
});

module.exports.routers = app => app.use('/shipping', router);
