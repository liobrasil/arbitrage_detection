const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const PROVIDER_URL = "";
const API_URL = "https://app.blocksec.com/api/v1/onchain/tx/balance-change";
const CHAIN_ID = 56; // BSC mainnet chain ID

// Initialize Ethereum provider
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);

// Function to fetch all transactions for a given block
async function fetchTransactions(blockNumber) {
  const block = await provider.getBlock(blockNumber);
  return block.transactions;
}

// Function to get the transaction receipt to check if the transaction was successful
async function isTransactionSuccessful(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  return receipt.status === 1 && Number(receipt.gasUsed) > 120000;
}

// Function to check if the transaction contains at least two "Swap" events (V2 or V3)
async function containsArbitrage(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  const logs = receipt.logs;

  // Define event signatures for Uniswap V2 and V3 "Swap" events
  const swapEventSignatureV2 = ethers.id(
    "Swap(address,uint256,uint256,uint256,uint256,address)"
  );
  const swapEventSignatureV3 = ethers.id(
    "Swap(address,address,int256,int256,uint160,uint128,int24)"
  );

  // Count the number of "Swap" events found
  let swapEventCount = 0;
  let swapPath = [];

  // Iterate through logs to identify the Swap events and their type
  for (const log of logs) {
    if (log.topics.includes(swapEventSignatureV2)) {
      swapEventCount++;
      swapPath.push("V2"); // Record V2 swap event
    } else if (log.topics.includes(swapEventSignatureV3)) {
      swapEventCount++;
      swapPath.push("V3"); // Record V3 swap event
    }
  }

  // If at least two Swap events are found, return true for arbitrage
  if (swapEventCount >= 2) {
    return { hasSwapEvent: true, swapEventCount, swapPath };
  }

  // If fewer than two Swap events are found, return false
  return { hasSwapEvent: false, swapEventCount: 0, swapPath };
}

// Function to call the BlockSec API
async function callBlockSecAPI(txHash) {
  const payload = {
    chainID: CHAIN_ID,
    txnHash: txHash,
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data.balanceChanges;
  } catch (error) {
    console.error("Error calling BlockSec API:", error);
    return [];
  }
}

// Function to compute the difference between values for sign true and sign false
function computeValueDifference(toOrFromBalanceChanges) {
  let valuePositive = 0;
  let valueNegative = 0;

  for (const asset of toOrFromBalanceChanges.assets) {
    const value = Number(asset.value);
    if (asset.sign) {
      valuePositive += value; // Sum up values with sign true
    } else {
      valueNegative += value; // Sum up values with sign false
    }
  }

  // Calculate the difference: value for sign true - value for sign false
  const difference = valuePositive - valueNegative;
  return difference;
}

// Main function to execute the filtering process
async function processBlockTransactions(blockNumber) {
  let botAddress = "";
  let totalArbitrageCount = 0;
  const transactions = await fetchTransactions(blockNumber);

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    // Get the transaction details to access the 'to' address
    const txDetails = await provider.getTransaction(tx);
    const toAddress = txDetails.to;
    const fromAdress = txDetails.from;

    // Step 2: Filter only successful transactions with gas usage > 120,000
    const isSuccessful = await isTransactionSuccessful(tx);
    if (!isSuccessful) continue;

    // Step 4: Filter transactions that contain the "Swap" event
    const { hasSwapEvent, swapEventCount, swapPath } = await containsArbitrage(
      tx
    );

    if (!hasSwapEvent) continue;

    // Step 5: Call the BlockSec API
    const balanceChanges = await callBlockSecAPI(tx);

    // Step 6: Check if the 'to' or 'from' address has balance changes
    const toAddressBalanceChange = balanceChanges.find(
      (change) => change.account.toLowerCase() === toAddress.toLowerCase()
    );
    const toBalanceDifference = toAddressBalanceChange
      ? computeValueDifference(toAddressBalanceChange)
      : 0;

    const fromAddressBalanceChange = balanceChanges.find(
      (change) => change.account.toLowerCase() === fromAdress.toLowerCase()
    );
    const fromBalanceDifference = fromAddressBalanceChange
      ? computeValueDifference(fromAddressBalanceChange)
      : 0;

    // Step 7: Filter the result for positive amounts in the first element
    const condition = toAddressBalanceChange || fromAddressBalanceChange;

    if (condition) {
      totalArbitrageCount++;

      if (balanceChanges[0].account.toLowerCase() === toAddress.toLowerCase())
        botAddress = balanceChanges[0].account;

      console.log("------------ Transaction Details ------------");
      console.log("Position of the transaction in the block:", i);
      console.log("Transaction hash:", tx);
      console.log("Bot address:", botAddress);
      console.log(
        "Profit in USD:",
        toAddressBalanceChange ? toBalanceDifference : fromBalanceDifference
      );
      console.log("Number of swaps:", swapEventCount);
      console.log("Swap path:", swapPath);
      console.log("--------------------------------------------");
    }
  }

  console.log("Finished processing transactions for block", blockNumber);
  console.log(
    "Total number of arbitrage opportunities found:",
    totalArbitrageCount
  );
}

// Example usage with a specific block number
const blockNumber = 44023655; // Replace with your block number
processBlockTransactions(blockNumber);
