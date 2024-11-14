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
  const block = await provider.getBlock(blockNumber)
  return block.transactions;
}

// Function to get the transaction receipt to check if the transaction was successful
async function isTransactionSuccessful(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  return receipt.status === 1 && Number(receipt.gasUsed) > 150000;
}

// Function to check if the transaction contains the "Swap" event
async function containsSwapEvent(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  const logs = receipt.logs;

  // Define event signatures for Uniswap V2 and V3 "Swap" events
  const swapEventSignatureV2 = ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)");
  const swapEventSignatureV3 = ethers.id("Swap(address,address,int256,int256,uint160,uint128,int24)");

  // Check if any log contains either the V2 or V3 "Swap" event signature
  return logs.some(log => 
    log.topics.includes(swapEventSignatureV2) || 
    log.topics.includes(swapEventSignatureV3)
  );
}

// Function to call the BlockSec API
async function callBlockSecAPI(txHash) {
  const payload = {
    chainID: CHAIN_ID,
    txnHash: txHash
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers: { "Content-Type": "application/json" }
    });
    return response.data.balanceChanges;
  } catch (error) {
    console.error("Error calling BlockSec API:", error);
    return [];
  }
}

// Main function to execute the filtering process
async function processBlockTransactions(blockNumber) {
  const transactions = await fetchTransactions(blockNumber);
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    // Step 2: Filter only successful transactions with gas usage > 150,000
    const isSuccessful = await isTransactionSuccessful(tx);
    if (!isSuccessful) continue;

    // Step 4: Filter transactions that contain the "Swap" event
    const hasSwapEvent = await containsSwapEvent(tx);
    if (!hasSwapEvent) continue;

    // Step 5: Call the BlockSec API
    const balanceChanges = await callBlockSecAPI(tx);

    // Step 6: Filter the result for positive amounts in the first element
    const condition = balanceChanges.length > 2 && 
                      !balanceChanges[0].assets[0].isERC1155 && 
                      !balanceChanges[0].assets[0].isERC721;
    
    if (condition) {
      console.log("------------ Transaction Details ------------");
      console.log("Position of the transaction in the block:", i); // Position of the txn
      console.log("Transaction hash:", tx);
      console.log("Bot address:", balanceChanges[0].account);
      console.log("Amount:", balanceChanges[0].assets[0].amount);
      console.log("Number of assets:", balanceChanges[0].assets.length);
      console.log("--------------------------------------------");
    }
  }
}

// Example usage with a specific block number
const blockNumber = 44010758; // Replace with your block number
processBlockTransactions(blockNumber);

    // const condition = balanceChanges.length > 2 && parseFloat(balanceChanges[0].assets[0].amount) && balanceChanges[0].assets[0].sign && !balanceChanges[0].assets[0].isERC1155 && !balanceChanges[0].assets[0].isERC721;
