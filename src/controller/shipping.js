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
  const carrier = params.carrier;
  const country = params.country;
  const state = params.state;
  const city = params.city;
  const postalCode = params.postalCode;
  const weight = parseFloat(params.weight);
  const length = parseFloat(params.length);
  const width = parseFloat(params.width);
  const height = parseFloat(params.height);
  const invoiceAmount = parseFloat(params.invoiceAmount);
  const freightWeight = parseFloat(params.freightWeight || process.env.FREIGHT_WEIGHT);
  const minFreightWeightAmount = parseFloat(params.minFreightWeightAmount || process.env.MIN_FREIGHT_WEIGHT_AMOUNT);
  const gris = parseFloat(params.gris || process.env.GRIS);
  const advalorem = parseFloat(params.advalorem || process.env.ADVALOREM);
  const roadToll = parseFloat(params.roadToll || process.env.ROAD_TOLL);
  const shippingFee = parseFloat(params.shippingFee || process.env.SHIPPING_FEE);
  const cubage = parseFloat(params.cubage || process.env.CUBAGE);
  const icms = parseFloat(params.icms || process.env.ICMS);

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
    length,
    width,
    height,
    invoiceAmount,
    freightWeight,
    minFreightWeightAmount,
    gris,
    advalorem,
    roadToll,
    shippingFee,
    cubage,
    icms,
  };
}

function calc(params) {
  const roadTollAmount = (params.roadToll * Math.ceil(params.weight / 100)).myRound(2);
  const cubedWeight = params.length * params.width * params.height * params.cubage;
  const finalWeight = params.weight > cubedWeight ? params.weight : cubedWeight;
  const freightWeightAmount = (params.freightWeight * finalWeight).myRound(2);
  const grisAmount = ((params.gris / 100) * params.invoiceAmount).myRound(2);
  const advaloremAmount = ((params.advalorem / 100) * params.invoiceAmount).myRound(2);
  const freightAmount =
    (freightWeightAmount > params.minFreightWeightAmount ? freightWeightAmount : params.minFreightWeightAmount) +
    grisAmount +
    advaloremAmount +
    roadTollAmount +
    params.shippingFee;

  const icmsAmount = ((freightAmount / (1 - params.icms / 100)) * (params.icms / 100)).myRound(2);
  const freightTotalAmount = (freightAmount + icmsAmount).myRound(2);

  return {
    cubedWeight,
    finalWeight,
    advaloremAmount,
    grisAmount,
    roadTollAmount,
    freightWeightAmount,
    freightAmount,
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
