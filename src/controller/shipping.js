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
  console.log('validation ini');

  console.log('validation fim');
  if (!params.weight || 0 === params.weight.length) {
    throw 'weight parameter is required';
  }
  if (!params.weight.isNumber()) {
    throw 'weight parameter is only numbers';
  }
  if (!params.carrier || 0 === params.carrier.length) {
    throw 'carrier parameter is required';
  }
  if (!params.invoiceAmount || 0 === params.invoiceAmount.length) {
    throw 'invoiceAmount parameter is required';
  }
  if (!params.invoiceAmount.isNumber()) {
    throw 'invoiceAmount parameter is only numbers';
  }
  if ((!params.postalCode || 0 === params.postalCode.length) && (!params.state || 0 === params.state.length)) {
    throw 'postalCode or state parameters is required';
  }
  if (!params.postalCode.isNumber() && !(!params.postalCode || 0 === params.postalCode.length)) {
    throw 'postalCode parameter is only numbers';
  }
  if (params.postalCode.length > 8) {
    throw 'postalCode parameter have max length = 8';
  }

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
  const cubedWeight = ((params.length / 100) * (params.width / 100) * (params.height / 100) * params.cubage).myRound(2);
  const finalWeight = params.weight > cubedWeight ? params.weight : cubedWeight;
  const roadTollAmount = (params.roadToll * Math.ceil(finalWeight / 100)).myRound(2);
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
    logger.verbose(JSON.stringify({ parameters }));
    const calculation = calc(parameters);
    logger.verbose(JSON.stringify({ calculation }));
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
