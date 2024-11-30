const { ethers } = require("ethers");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Read JSON file synchronously
const filePath = "./dexFactories.json";
// Function to read and parse the JSON file
const readJsonFile = () => {
  try {
    const rawData = fs.readFileSync(filePath, "utf8"); // Synchronously read the file
    const dexFactories = JSON.parse(rawData); // Parse the JSON
    console.log("Updated JSON data:", dexFactories); // Log or use the refreshed data
    return dexFactories;
  } catch (error) {
    console.error("Error reading or parsing the JSON file:", error);
    return null; // Return null or handle the error as needed
  }
};

let dexFactories = readJsonFile();

const OUR_CONTRACT_ADDRESS = "0xa08a96303abcaf78789104567cc59ba891de0864";
const BSCSCAN_API_KEY = "71XH1XIDNUERIVZ7P8YUUE41K7EZT7245S";

const extractMultipliers = (code) => {
  try {
    // Regular expressions to match base and fee multipliers
    const base0Pattern = /balance0\.mul\((\d+)\)/;
    const base1Pattern = /balance1\.mul\((\d+)\)/;
    const fee0Pattern = /amount0In\.mul\((\d+)\)/;
    const fee1Pattern = /amount1In\.mul\((\d+)\)/;

    // Find matches
    const base0Match = code.match(base0Pattern);
    const base1Match = code.match(base1Pattern);
    const fee0Match = code.match(fee0Pattern);
    const fee1Match = code.match(fee1Pattern);

    if ((!base0Match && !fee0Match) || (!base1Match && !fee1Match)) {
      return {
        success: false,
        error: "Could not find all multipliers",
      };
    }

    // Extract values
    const base0 = parseInt(base0Match[1]);
    const base1 = parseInt(base1Match[1]);
    const fee0 = parseInt(fee0Match[1]);
    const fee1 = parseInt(fee1Match[1]);

    return {
      success: true,
      fee: (fee0 * 100 * 10000) / base0,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Function to add a factory
const addFactory = async (key, value) => {
  // Read the existing JSON data
  fs.readFile(filePath, "utf8", async (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    // Parse the JSON data
    let jsonData = JSON.parse(data);

    for (const keyObject in jsonData) {
      if (
        jsonData[keyObject].toLowerCase() === value.toLowerCase() &&
        keyObject.includes("NewFactory")
      ) {
        delete jsonData[keyObject];
        console.log(
          `Deleted keyObject "${keyObject}" with value "${value}" as it matched "NewFactory".`
        );
      }
    }

    // Check if the value (address) already exists
    const addressExists = Object.values(jsonData).includes(value);

    if (addressExists) {
      console.log(`Address ${value} already exists. Skipping.`);
      return;
    }

    const isContractVerified = await checkContractsVerified([value]);

    if (isContractVerified.length > 0 && isContractVerified[0].verified) {
      const contractDatas = await fetchContractCode(value);

      const multipliers = extractMultipliers(contractDatas.sourceCode);

      if (multipliers.success) {
        key = contractDatas.contractName;
        if (Object.keys(dexFactories).includes(key)) {
          key = `${contractDatas.contractName}_${
            Object.keys(dexFactories).length
          }`;
        }

        const logNewContract = {
          ...{
            timestamp: getTimestamp(),
            level: "INFO",
            _type: "NewDexes",
            _appid: "adfl_bsc_mev_analyse",
          },
          ...contractDatas,
          address: value,
          fees: multipliers.fee,

          nameInDexFactory: key,
        };

        writeToLogFile(logNewContract);
      }
    }

    // Add the new factory
    jsonData[key] = value;

    // Write the updated JSON back to the file
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error("Error writing file:", err);
        return;
      }
      console.log("Factory added successfully!");

      // Refresh the dexFactories variable
      dexFactories = readJsonFile(); // Update the variable after adding
      console.log("Updated dexFactories:", dexFactories);
    });
  });
};

// Configuration
const IPC_PATH = "/data/bsc/geth.fast/geth.ipc";
const KUCOIN_API_URL = "https://api.kucoin.com/api/v1/market/allTickers";
const HUOBI_API_URL = "https://api.huobi.pro/market/tickers";
const OKX_API_URL = "https://www.okx.com/api/v5/market/tickers?instType=SPOT";

const BUILDER_JETBLDR_ADDRESSES = [
  "0x345324dc15f1cdcf9022e3b7f349e911fb823b4c",
];

const BUILDER_TXBOOST_ADDRESSES = [
  "0x6dddf681c908705472d09b1d7036b2241b50e5c7", // Txboost: Builder 1
  "0x76736159984ae865a9b9cc0df61484a49da68191", // Txboost: Builder 2
  "0x5054b21d8baea3d602dca8761b235ee10bc0231e", // Txboost: Builder 3
];

const BUILDER_PUISSANT_ADDRESSES = [
  "0x487e5dfe70119c1b320b8219b190a6fa95a5bb48", // Puissant: Builder 1
  "0x48b4bbebf0655557a461e91b8905b85864b8bb48", // Puissant: Builder 2
  "0x48fee1bb3823d72fdf80671ebad5646ae397bb48", // Puissant: Builder 3
  "0x48b2665e5e9a343409199d70f7495c8ab660bb48", // Puissant: Builder 4
  "0x48a5ed9abc1a8fbe86cec4900483f43a7f2dbb48", // Puissant: Builder 5
  "0x4848489f0b2bedd788c696e2d79b6b69d7484848", // Puissant: Payment
];
const BUILDER_NODEREAL_ADDRESSES = [
  "0x79102db16781dddff63f301c9be557fd1dd48fa0", // Nodereal: Builder 1
  "0xd0d56b330a0dea077208b96910ce452fd77e1b6f", // Nodereal: Builder 2
  "0x4f24ce4cd03a6503de97cf139af2c26347930b99", // Nodereal: Builder 3
];
const BUILDER_BLOCKSMITH_ADDRESSES = [
  "0x0000000000007592b04bb3bb8985402cc37ca224",
  "0x6af484eabbcf3cbdf603df87d3ace75de13c28f3",
];
const BUILDER_BLOCKRAZOR_ADDRESSES = [
  "0x1266c6be60392a8ff346e8d5eccd3e69dd9c5f20", // BlockRazor: Payment
  "0x5532cdb3c0c4278f9848fc4560b495b70ba67455", // Blockrazor: Builder 1
  "0x49d91b1ab0cc6a1591c2e5863e602d7159d36149", // Blockrazor: Builder 2
  "0xba4233f6e478db76698b0a5000972af0196b7be1", // Blockrazor: Builder 3
  "0x539e24781f616f0d912b60813ab75b7b80b75c53", // Blockrazor: Builder 4
  "0x50061047b9c7150f0dc105f79588d1b07d2be250", // Blockrazor: Builder 5
  "0x488e37fcb2024a5b2f4342c7de636f0825de6448", // Blockrazor: Builder 6
  "0x0557e8cb169f90f6ef421a54e29d7dd0629ca597", // Blockrazor: Builder 7
];
const BUILDER_BLOXROUTE_ADDRESSES = [
  "0x74c5f8c6ffe41ad4789602bdb9a48e6cad623520",
  "0xd4376fdc9b49d90e6526daa929f2766a33bffd52", // Bloxroute: Builder 1
  "0x2873fc7ad9122933becb384f5856f0e87918388d", // Bloxroute: Builder 2
  "0x432101856a330aafdeb049dd5fa03a756b3f1c66", // Bloxroute: Builder 3
  "0x2b217a4158933aade6d6494e3791d454b4d13ae7", // Bloxroute: Builder 4
  "0x0da52e9673529b6e06f444fbbed2904a37f66415", // Bloxroute: Builder 5
  "0xe1ec1aece7953ecb4539749b9aa2eef63354860a", // Bloxroute: Builder 6
  "0x89434fc3a09e583f2cb4e47a8b8fe58de8be6a15", // Bloxroute: Builder 7
];

//ERC20 ABI
const erc20Abi = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [],
    name: "_decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "_name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "_symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burn",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

async function checkContractsVerified(contractAddresses) {
  const results = [];

  for (const address of contractAddresses) {
    const url = `https://api.bscscan.com/api?module=contract&action=getabi&address=${address}&apikey=${BSCSCAN_API_KEY}`;
    try {
      const response = await axios.get(url);
      const data = response.data;

      results.push({
        address: address,
        verified: data.status === "1", // true if verified, false otherwise
      });
    } catch (error) {
      console.error(`Error checking address ${address}:`, error.message);
      results.push({
        address: address,
        verified: null, // null indicates an error occurred
      });
    }
  }

  return results;
}

async function getOurBotUsdBalance(priceMap) {
  let walletAddress = OUR_CONTRACT_ADDRESS;

  // Token addresses from your portfolio
  const tokens = [
    { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" },
    { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" },
    { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" },
    { symbol: "ETH", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" },
    { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
    { symbol: "BTCB", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" },
    { symbol: "ADA", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47" },
    { symbol: "MATIC", address: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD" },
    { symbol: "DAI", address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3" },
  ];

  const balances = [];

  for (const token of tokens) {
    try {
      const contract = new ethers.Contract(token.address, erc20Abi, provider);

      // Get balance and decimals in parallel
      const [balance, decimals] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
      ]);

      // Convert balance to human readable format
      const formattedBalance = ethers.formatUnits(balance, decimals);

      // Handle WBNB to BNB symbol conversion
      let symbol = token.symbol;
      if (symbol === "WBNB") {
        symbol = "BNB";
      }

      // Create symbol pairs for price mapping
      const symbolToUSDT = `${symbol}-USDT`;
      const symbolToUSDC = `${symbol}-USDC`;
      const symbolToUSD = `${symbol}-USD`;

      // Fetch the price from the price map
      const priceInUSD =
        priceMap[symbolToUSDT] ||
        priceMap[symbolToUSDC] ||
        priceMap[symbolToUSD] ||
        0;

      balances.push({
        symbol: token.symbol,
        address: token.address,
        balance: formattedBalance,
        rawBalance: balance.toString(),
        priceUSD: priceInUSD,
        valueUSD: parseFloat(formattedBalance) * priceInUSD,
      });
    } catch (error) {
      console.error(
        `Error fetching balance for ${token.symbol}:`,
        error.message
      );
    }
  }

  // Calculate total portfolio value
  const totalValue = balances.reduce((sum, token) => sum + token.valueUSD, 0);
  return { totalValue, balances };
}

// Function to find the DEX name by address
function getDexNameByAddress(address) {
  for (const [dexName, dexAddress] of Object.entries(dexFactories)) {
    if (dexAddress.toLowerCase() === address.toLowerCase()) {
      return dexName; // Return the name of the DEX
    }
  }
  return "Unknown";
}

const V2Abi = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0Out",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1Out",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve0",
        type: "uint112",
      },
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve1",
        type: "uint112",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "MINIMUM_LIQUIDITY",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "PERMIT_TYPEHASH",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "_reserve0", type: "uint112" },
      { internalType: "uint112", name: "_reserve1", type: "uint112" },
      { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "_token0", type: "address" },
      { internalType: "address", name: "_token1", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "kLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price0CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price1CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "skim",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "uint256", name: "amount0Out", type: "uint256" },
      { internalType: "uint256", name: "amount1Out", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "swap",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "sync",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];
const V3Abi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickLower",
        type: "int24",
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickUpper",
        type: "int24",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickLower",
        type: "int24",
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickUpper",
        type: "int24",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount0",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount1",
        type: "uint128",
      },
    ],
    name: "Collect",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount0",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount1",
        type: "uint128",
      },
    ],
    name: "CollectProtocol",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paid0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paid1",
        type: "uint256",
      },
    ],
    name: "Flash",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint16",
        name: "observationCardinalityNextOld",
        type: "uint16",
      },
      {
        indexed: false,
        internalType: "uint16",
        name: "observationCardinalityNextNew",
        type: "uint16",
      },
    ],
    name: "IncreaseObservationCardinalityNext",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160",
      },
      { indexed: false, internalType: "int24", name: "tick", type: "int24" },
    ],
    name: "Initialize",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickLower",
        type: "int24",
      },
      {
        indexed: true,
        internalType: "int24",
        name: "tickUpper",
        type: "int24",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint32",
        name: "feeProtocol0Old",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "feeProtocol1Old",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "feeProtocol0New",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "feeProtocol1New",
        type: "uint32",
      },
    ],
    name: "SetFeeProtocol",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "addr",
        type: "address",
      },
    ],
    name: "SetLmPoolEvent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount0",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount1",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "liquidity",
        type: "uint128",
      },
      { indexed: false, internalType: "int24", name: "tick", type: "int24" },
      {
        indexed: false,
        internalType: "uint128",
        name: "protocolFeesToken0",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "protocolFeesToken1",
        type: "uint128",
      },
    ],
    name: "Swap",
    type: "event",
  },
  {
    inputs: [
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "uint128", name: "amount", type: "uint128" },
    ],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "uint128", name: "amount0Requested", type: "uint128" },
      { internalType: "uint128", name: "amount1Requested", type: "uint128" },
    ],
    name: "collect",
    outputs: [
      { internalType: "uint128", name: "amount0", type: "uint128" },
      { internalType: "uint128", name: "amount1", type: "uint128" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint128", name: "amount0Requested", type: "uint128" },
      { internalType: "uint128", name: "amount1Requested", type: "uint128" },
    ],
    name: "collectProtocol",
    outputs: [
      { internalType: "uint128", name: "amount0", type: "uint128" },
      { internalType: "uint128", name: "amount1", type: "uint128" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "fee",
    outputs: [{ internalType: "uint24", name: "", type: "uint24" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeGrowthGlobal0X128",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeGrowthGlobal1X128",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "flash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16",
      },
    ],
    name: "increaseObservationCardinalityNext",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "liquidity",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lmPool",
    outputs: [
      { internalType: "contract IPancakeV3LmPool", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxLiquidityPerTick",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "uint128", name: "amount", type: "uint128" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "mint",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "observations",
    outputs: [
      { internalType: "uint32", name: "blockTimestamp", type: "uint32" },
      { internalType: "int56", name: "tickCumulative", type: "int56" },
      {
        internalType: "uint160",
        name: "secondsPerLiquidityCumulativeX128",
        type: "uint160",
      },
      { internalType: "bool", name: "initialized", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32[]", name: "secondsAgos", type: "uint32[]" },
    ],
    name: "observe",
    outputs: [
      { internalType: "int56[]", name: "tickCumulatives", type: "int56[]" },
      {
        internalType: "uint160[]",
        name: "secondsPerLiquidityCumulativeX128s",
        type: "uint160[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "positions",
    outputs: [
      { internalType: "uint128", name: "liquidity", type: "uint128" },
      {
        internalType: "uint256",
        name: "feeGrowthInside0LastX128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthInside1LastX128",
        type: "uint256",
      },
      { internalType: "uint128", name: "tokensOwed0", type: "uint128" },
      { internalType: "uint128", name: "tokensOwed1", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolFees",
    outputs: [
      { internalType: "uint128", name: "token0", type: "uint128" },
      { internalType: "uint128", name: "token1", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32", name: "feeProtocol0", type: "uint32" },
      { internalType: "uint32", name: "feeProtocol1", type: "uint32" },
    ],
    name: "setFeeProtocol",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_lmPool", type: "address" }],
    name: "setLmPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      {
        internalType: "uint16",
        name: "observationCardinality",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16",
      },
      { internalType: "uint32", name: "feeProtocol", type: "uint32" },
      { internalType: "bool", name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
    ],
    name: "snapshotCumulativesInside",
    outputs: [
      { internalType: "int56", name: "tickCumulativeInside", type: "int56" },
      {
        internalType: "uint160",
        name: "secondsPerLiquidityInsideX128",
        type: "uint160",
      },
      { internalType: "uint32", name: "secondsInside", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "bool", name: "zeroForOne", type: "bool" },
      { internalType: "int256", name: "amountSpecified", type: "int256" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "swap",
    outputs: [
      { internalType: "int256", name: "amount0", type: "int256" },
      { internalType: "int256", name: "amount1", type: "int256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "int16", name: "", type: "int16" }],
    name: "tickBitmap",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tickSpacing",
    outputs: [{ internalType: "int24", name: "", type: "int24" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "int24", name: "", type: "int24" }],
    name: "ticks",
    outputs: [
      { internalType: "uint128", name: "liquidityGross", type: "uint128" },
      { internalType: "int128", name: "liquidityNet", type: "int128" },
      {
        internalType: "uint256",
        name: "feeGrowthOutside0X128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthOutside1X128",
        type: "uint256",
      },
      { internalType: "int56", name: "tickCumulativeOutside", type: "int56" },
      {
        internalType: "uint160",
        name: "secondsPerLiquidityOutsideX128",
        type: "uint160",
      },
      { internalType: "uint32", name: "secondsOutside", type: "uint32" },
      { internalType: "bool", name: "initialized", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const balancerAbi = [
  {
    inputs: [
      {
        internalType: "contract IAuthorizer",
        name: "authorizer",
        type: "address",
      },
      { internalType: "contract IWETH", name: "weth", type: "address" },
      { internalType: "uint256", name: "pauseWindowDuration", type: "uint256" },
      {
        internalType: "uint256",
        name: "bufferPeriodDuration",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract IAuthorizer",
        name: "newAuthorizer",
        type: "address",
      },
    ],
    name: "AuthorizerChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ExternalBalanceTransfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract IFlashLoanRecipient",
        name: "recipient",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "feeAmount",
        type: "uint256",
      },
    ],
    name: "FlashLoan",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "token",
        type: "address",
      },
      { indexed: false, internalType: "int256", name: "delta", type: "int256" },
    ],
    name: "InternalBalanceChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "bool", name: "paused", type: "bool" },
    ],
    name: "PausedStateChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "poolId",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "liquidityProvider",
        type: "address",
      },
      {
        indexed: false,
        internalType: "contract IERC20[]",
        name: "tokens",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "int256[]",
        name: "deltas",
        type: "int256[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "protocolFeeAmounts",
        type: "uint256[]",
      },
    ],
    name: "PoolBalanceChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "poolId",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "assetManager",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "cashDelta",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "managedDelta",
        type: "int256",
      },
    ],
    name: "PoolBalanceManaged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "poolId",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "poolAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "enum IVault.PoolSpecialization",
        name: "specialization",
        type: "uint8",
      },
    ],
    name: "PoolRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "relayer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "RelayerApprovalChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "poolId",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "tokenIn",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "tokenOut",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "poolId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "contract IERC20[]",
        name: "tokens",
        type: "address[]",
      },
    ],
    name: "TokensDeregistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "poolId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "contract IERC20[]",
        name: "tokens",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "address[]",
        name: "assetManagers",
        type: "address[]",
      },
    ],
    name: "TokensRegistered",
    type: "event",
  },
  {
    inputs: [],
    name: "WETH",
    outputs: [{ internalType: "contract IWETH", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "enum IVault.SwapKind", name: "kind", type: "uint8" },
      {
        components: [
          { internalType: "bytes32", name: "poolId", type: "bytes32" },
          { internalType: "uint256", name: "assetInIndex", type: "uint256" },
          { internalType: "uint256", name: "assetOutIndex", type: "uint256" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "bytes", name: "userData", type: "bytes" },
        ],
        internalType: "struct IVault.BatchSwapStep[]",
        name: "swaps",
        type: "tuple[]",
      },
      { internalType: "contract IAsset[]", name: "assets", type: "address[]" },
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "bool", name: "fromInternalBalance", type: "bool" },
          {
            internalType: "address payable",
            name: "recipient",
            type: "address",
          },
          { internalType: "bool", name: "toInternalBalance", type: "bool" },
        ],
        internalType: "struct IVault.FundManagement",
        name: "funds",
        type: "tuple",
      },
      { internalType: "int256[]", name: "limits", type: "int256[]" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "batchSwap",
    outputs: [
      { internalType: "int256[]", name: "assetDeltas", type: "int256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "poolId", type: "bytes32" },
      { internalType: "contract IERC20[]", name: "tokens", type: "address[]" },
    ],
    name: "deregisterTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "poolId", type: "bytes32" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address payable", name: "recipient", type: "address" },
      {
        components: [
          {
            internalType: "contract IAsset[]",
            name: "assets",
            type: "address[]",
          },
          {
            internalType: "uint256[]",
            name: "minAmountsOut",
            type: "uint256[]",
          },
          { internalType: "bytes", name: "userData", type: "bytes" },
          { internalType: "bool", name: "toInternalBalance", type: "bool" },
        ],
        internalType: "struct IVault.ExitPoolRequest",
        name: "request",
        type: "tuple",
      },
    ],
    name: "exitPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IFlashLoanRecipient",
        name: "recipient",
        type: "address",
      },
      { internalType: "contract IERC20[]", name: "tokens", type: "address[]" },
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
      { internalType: "bytes", name: "userData", type: "bytes" },
    ],
    name: "flashLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "selector", type: "bytes4" }],
    name: "getActionId",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAuthorizer",
    outputs: [
      { internalType: "contract IAuthorizer", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDomainSeparator",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "contract IERC20[]", name: "tokens", type: "address[]" },
    ],
    name: "getInternalBalance",
    outputs: [
      { internalType: "uint256[]", name: "balances", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getNextNonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPausedState",
    outputs: [
      { internalType: "bool", name: "paused", type: "bool" },
      { internalType: "uint256", name: "pauseWindowEndTime", type: "uint256" },
      { internalType: "uint256", name: "bufferPeriodEndTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "poolId", type: "bytes32" }],
    name: "getPool",
    outputs: [
      { internalType: "address", name: "", type: "address" },
      {
        internalType: "enum IVault.PoolSpecialization",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "poolId", type: "bytes32" },
      { internalType: "contract IERC20", name: "token", type: "address" },
    ],
    name: "getPoolTokenInfo",
    outputs: [
      { internalType: "uint256", name: "cash", type: "uint256" },
      { internalType: "uint256", name: "managed", type: "uint256" },
      { internalType: "uint256", name: "lastChangeBlock", type: "uint256" },
      { internalType: "address", name: "assetManager", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "poolId", type: "bytes32" }],
    name: "getPoolTokens",
    outputs: [
      { internalType: "contract IERC20[]", name: "tokens", type: "address[]" },
      { internalType: "uint256[]", name: "balances", type: "uint256[]" },
      { internalType: "uint256", name: "lastChangeBlock", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getProtocolFeesCollector",
    outputs: [
      {
        internalType: "contract IProtocolFeesCollector",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "address", name: "relayer", type: "address" },
    ],
    name: "hasApprovedRelayer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "poolId", type: "bytes32" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      {
        components: [
          {
            internalType: "contract IAsset[]",
            name: "assets",
            type: "address[]",
          },
          {
            internalType: "uint256[]",
            name: "maxAmountsIn",
            type: "uint256[]",
          },
          { internalType: "bytes", name: "userData", type: "bytes" },
          { internalType: "bool", name: "fromInternalBalance", type: "bool" },
        ],
        internalType: "struct IVault.JoinPoolRequest",
        name: "request",
        type: "tuple",
      },
    ],
    name: "joinPool",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "enum IVault.PoolBalanceOpKind",
            name: "kind",
            type: "uint8",
          },
          { internalType: "bytes32", name: "poolId", type: "bytes32" },
          { internalType: "contract IERC20", name: "token", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        internalType: "struct IVault.PoolBalanceOp[]",
        name: "ops",
        type: "tuple[]",
      },
    ],
    name: "managePoolBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "enum IVault.UserBalanceOpKind",
            name: "kind",
            type: "uint8",
          },
          { internalType: "contract IAsset", name: "asset", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "address", name: "sender", type: "address" },
          {
            internalType: "address payable",
            name: "recipient",
            type: "address",
          },
        ],
        internalType: "struct IVault.UserBalanceOp[]",
        name: "ops",
        type: "tuple[]",
      },
    ],
    name: "manageUserBalance",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "enum IVault.SwapKind", name: "kind", type: "uint8" },
      {
        components: [
          { internalType: "bytes32", name: "poolId", type: "bytes32" },
          { internalType: "uint256", name: "assetInIndex", type: "uint256" },
          { internalType: "uint256", name: "assetOutIndex", type: "uint256" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "bytes", name: "userData", type: "bytes" },
        ],
        internalType: "struct IVault.BatchSwapStep[]",
        name: "swaps",
        type: "tuple[]",
      },
      { internalType: "contract IAsset[]", name: "assets", type: "address[]" },
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "bool", name: "fromInternalBalance", type: "bool" },
          {
            internalType: "address payable",
            name: "recipient",
            type: "address",
          },
          { internalType: "bool", name: "toInternalBalance", type: "bool" },
        ],
        internalType: "struct IVault.FundManagement",
        name: "funds",
        type: "tuple",
      },
    ],
    name: "queryBatchSwap",
    outputs: [{ internalType: "int256[]", name: "", type: "int256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum IVault.PoolSpecialization",
        name: "specialization",
        type: "uint8",
      },
    ],
    name: "registerPool",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "poolId", type: "bytes32" },
      { internalType: "contract IERC20[]", name: "tokens", type: "address[]" },
      { internalType: "address[]", name: "assetManagers", type: "address[]" },
    ],
    name: "registerTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IAuthorizer",
        name: "newAuthorizer",
        type: "address",
      },
    ],
    name: "setAuthorizer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "paused", type: "bool" }],
    name: "setPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "relayer", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setRelayerApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "bytes32", name: "poolId", type: "bytes32" },
          { internalType: "enum IVault.SwapKind", name: "kind", type: "uint8" },
          { internalType: "contract IAsset", name: "assetIn", type: "address" },
          {
            internalType: "contract IAsset",
            name: "assetOut",
            type: "address",
          },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "bytes", name: "userData", type: "bytes" },
        ],
        internalType: "struct IVault.SingleSwap",
        name: "singleSwap",
        type: "tuple",
      },
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "bool", name: "fromInternalBalance", type: "bool" },
          {
            internalType: "address payable",
            name: "recipient",
            type: "address",
          },
          { internalType: "bool", name: "toInternalBalance", type: "bool" },
        ],
        internalType: "struct IVault.FundManagement",
        name: "funds",
        type: "tuple",
      },
      { internalType: "uint256", name: "limit", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swap",
    outputs: [
      { internalType: "uint256", name: "amountCalculated", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

// Helper function to get the current timestamp in ISO 8601 format
function getTimestamp() {
  return new Date().toISOString();
}

// Helper function to write data to the log file
function writeToLogFile(data) {
  const logDirectory = "/home/adfl/logs/monitoring";
  const date = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
  const logFileName = `adfl.log.${date}`;
  const logFilePath = path.join(logDirectory, logFileName);

  // Ensure the directory exists
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }

  // Write data to the log file
  const logEntry = JSON.stringify(data) + "\n";
  fs.appendFileSync(logFilePath, logEntry, "utf8");
}

// Initialize Ethereum provider
const provider = new ethers.IpcSocketProvider(IPC_PATH);

// Function to fetch all transactions for a given block
async function fetchTransactions(blockNumber) {
  const block = await provider.getBlock(blockNumber);
  return block.transactions;
}

function isPathValid(path) {
  // Iterate through the path to check if adjacent elements are connected
  for (let i = 0; i < path.length - 1; i++) {
    const [from, to] = path[i].split("=>"); // Split the current segment
    const [nextFrom] = path[i + 1].split("=>"); // Get the 'from' of the next segment

    if (to !== nextFrom) {
      return false; // The path is broken between adjacent segments
    }
  }

  // If no invalid connections were found, the path is valid
  return true;
}

function getUniqueFormattedPairs(dexPath, tokenPath) {
  if (dexPath.length !== tokenPath.length) return [];
  const uniquePairs = [];

  for (let i = 0; i < tokenPath.length; i++) {
    // Extract tokens for this swap
    const [tokenA, tokenB] = tokenPath[i].split("=>");

    // Order tokens alphabetically
    const orderedTokens = [tokenA, tokenB].sort().join("-");

    // Combine dex and ordered token pair
    if (uniquePairs.includes(`${dexPath[i]}: ${orderedTokens}`)) continue; // Skip if already found
    uniquePairs.push(`${dexPath[i]}: ${orderedTokens}`);
  }

  // Convert the set to an array and join with " and " as separator
  return uniquePairs;
}

async function fetchContractCode(contractAddress) {
  try {
    const response = await axios.get(
      `https://api.bscscan.com/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${BSCSCAN_API_KEY}`
    );

    const { data } = response;

    return {
      sourceCode: data.result[0].SourceCode.replace(/\r\n/g, " "),
      contractName: data.result[0].ContractName,
      abi: JSON.stringify(JSON.parse(data.result[0].ABI), 2, null),
    };
  } catch (error) {
    return {
      sourceCode: "",
      contractName: "",
      abi: "",
    };
  }
}

// Function to check if the transaction contains at least two "Swap" events (V2, V3, Curve, Balancer, 1inch, Kyber, dYdX)
async function containsArbitrage(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  const isSuccessful =
    receipt?.status === 1 && Number(receipt?.gasUsed) > 120000;

  // Initialize counters and path array
  let swapEventCount = 0;
  let dexPath = [];
  let tokenPath = [];
  let isValidPath = false;
  let amountsArray = [];
  let newDexes = [];
  let venueAddresses = [];

  if (!isSuccessful)
    return {
      hasSwapEvent: false,
      swapEventCount,
      dexPath,
      tokenPath,
      isValidPath,
      amountsArray,
      newDexes,
      venueAddresses,
      gasUsed: receipt?.gasUsed,
    };

  const logs = receipt.logs;

  // Define event signatures for various protocols
  const swapEventSignatureV2 = ethers.id(
    "Swap(address,uint256,uint256,uint256,uint256,address)"
  );
  const swapEventSignatureV3 = ethers.id(
    "Swap(address,address,int256,int256,uint160,uint128,int24)"
  );
  const swapEventSignatureMancakeV3 = ethers.id(
    "Swap(address,address,int256,int256,uint160,uint128,int24,uint128,uint128)"
  );
  const curveSwapSignature = ethers.id(
    "TokenExchange(address,int128,uint256,int128,uint256)"
  );
  const curveSwapSignatureNew = ethers.id(
    "TokenExchangeUnderlying(address,uint256,uint256,uint256,uint256)"
  );
  const balancerSwapSignature = ethers.id(
    "Swap(bytes32,address,address,uint256,uint256)"
  );
  const oneInchSwapSignature = ethers.id(
    "Swapped(address,address,address,address,uint256,uint256)"
  );
  const NerveSignature = ethers.id(
    "TokenSwap(address,uint256,uint256,uint128,uint128)"
  );
  const kyberSwapSignature = ethers.id(
    "Swap(address,address,uint256,uint256,uint256,uint256)"
  );
  const DODOSwapSignature = ethers.id(
    "DODOSwap(address,address,uint256,uint256,uint256, address, address)"
  );
  const MDEXV3SwapSignature = ethers.id(
    "SwapV3(address,address,bool,uint256,uint256, int24)"
  );
  const dydxTradeSignature = ethers.id(
    "LogTrade(address,address,address,uint256,uint256)"
  );
  const swapEventSignatureSmardex = ethers.id(
    "Swap(address,address,int256,int256)"
  );

  // Iterate through logs to identify the Swap events and their type
  for (const log of logs) {
    const pairAddress = log.address;
    let amounts,
      pairContract,
      factoryAddress,
      amount0In,
      amount1Out,
      amount0Out,
      amount1In,
      amount0,
      amount1;

    venueAddresses.push(pairAddress);

    switch (log.topics[0]) {
      case swapEventSignatureV2:
        swapEventCount++;
        pairContract = new ethers.Contract(pairAddress, V2Abi, provider);

        try {
          factoryAddress = await pairContract.factory();
          dexPath.push(getDexNameByAddress(factoryAddress));
          if (getDexNameByAddress(factoryAddress) == "Unknown") {
            newDexes.push(factoryAddress);
            await addFactory(
              `NewFactory${Object.keys(dexFactories).length}`,
              factoryAddress
            );
          }
        } catch (error) {
          dexPath.push("V2 interface issue");
        }
        try {
          [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
          ]);
          token0Contract = new ethers.Contract(
            token0Address,
            erc20Abi,
            provider
          );
          token1Contract = new ethers.Contract(
            token1Address,
            erc20Abi,
            provider
          );
          [token0Symbol, token1Symbol, token0Decimals, token1Decimals] =
            await Promise.all([
              token0Contract.symbol(),
              token1Contract.symbol(),
              token0Contract.decimals(),
              token1Contract.decimals(),
            ]);
        } catch (error) {
          token0Symbol = "Token0_InterfaceIssue";
          token1Symbol = "Token1_InterfaceIssue";
          token0Decimals = 18;
          token1Decimals = 18;
        }

        amounts = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256", "uint256", "uint256", "uint256"],
          log.data
        );
        amount0In = ethers.formatUnits(amounts[0], token0Decimals);
        amount1In = ethers.formatUnits(amounts[1], token1Decimals);
        amount0Out = ethers.formatUnits(amounts[2], token0Decimals);
        amount1Out = ethers.formatUnits(amounts[3], token1Decimals);

        if (amount0In != 0 && amount1Out != 0) {
          tokenPath.push(token0Symbol + "=>" + token1Symbol);
          amountsArray.push(amount0In + "=>" + amount1Out);
        } else {
          tokenPath.push(token1Symbol + "=>" + token0Symbol);
          amountsArray.push(amount1In + "=>" + amount0Out);
        }

        break;

      case swapEventSignatureV3:
        swapEventCount++;
        pairContract = new ethers.Contract(pairAddress, V3Abi, provider);

        try {
          factoryAddress = await pairContract.factory();
          dexPath.push(getDexNameByAddress(factoryAddress));
          if (getDexNameByAddress(factoryAddress) == "Unknown") {
            newDexes.push(factoryAddress);
            await addFactory(
              `NewFactory${Object.keys(dexFactories).length}`,
              factoryAddress
            );
          }
        } catch (error) {
          dexPath.push("V3 interface issue");
        }

        try {
          [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
          ]);
          token0Contract = new ethers.Contract(
            token0Address,
            erc20Abi,
            provider
          );
          token1Contract = new ethers.Contract(
            token1Address,
            erc20Abi,
            provider
          );
          [token0Symbol, token1Symbol, token0Decimals, token1Decimals] =
            await Promise.all([
              token0Contract.symbol(),
              token1Contract.symbol(),
              token0Contract.decimals(),
              token1Contract.decimals(),
            ]);
        } catch (error) {
          token0Symbol = "Token0_InterfaceIssue";
          token1Symbol = "Token1_InterfaceIssue";
          token0Decimals = 18;
          token1Decimals = 18;
        }

        amounts = ethers.AbiCoder.defaultAbiCoder().decode(
          ["int256", "int256", "uint160", "uint128", "int24"],
          log.data
        );

        amount0 = ethers.formatUnits(amounts[0], token0Decimals);
        amount1 = ethers.formatUnits(amounts[1], token1Decimals);
        if (Number(amount0) < 0) {
          tokenPath.push(token1Symbol + "=>" + token0Symbol);
          amountsArray.push(amount1 + "=>" + Math.abs(amount0));
        } else {
          tokenPath.push(token0Symbol + "=>" + token1Symbol);
          amountsArray.push(amount0 + "=>" + Math.abs(amount1));
        }
        break;

      case swapEventSignatureMancakeV3:
        swapEventCount++;
        pairContract = new ethers.Contract(pairAddress, V3Abi, provider);

        try {
          factoryAddress = await pairContract.factory();
          dexPath.push(getDexNameByAddress(factoryAddress));
          if (getDexNameByAddress(factoryAddress) == "Unknown") {
            newDexes.push(factoryAddress);
            await addFactory(
              `NewFactory${Object.keys(dexFactories).length}`,
              factoryAddress
            );
          }
        } catch (error) {
          dexPath.push("V3 Mancake interface issue");
        }

        try {
          [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
          ]);
          token0Contract = new ethers.Contract(
            token0Address,
            erc20Abi,
            provider
          );
          token1Contract = new ethers.Contract(
            token1Address,
            erc20Abi,
            provider
          );
          [token0Symbol, token1Symbol, token0Decimals, token1Decimals] =
            await Promise.all([
              token0Contract.symbol(),
              token1Contract.symbol(),
              token0Contract.decimals(),
              token1Contract.decimals(),
            ]);
        } catch (error) {
          token0Symbol = "Token0_InterfaceIssue";
          token1Symbol = "Token1_InterfaceIssue";
          token0Decimals = 18;
          token1Decimals = 18;
        }

        amounts = ethers.AbiCoder.defaultAbiCoder().decode(
          [
            "int256",
            "int256",
            "uint160",
            "uint128",
            "int24",
            "uint128",
            "uint128",
          ],
          log.data
        );

        amount0 = ethers.formatUnits(amounts[0], token0Decimals);
        amount1 = ethers.formatUnits(amounts[1], token1Decimals);
        if (Number(amount0) < 0) {
          tokenPath.push(token1Symbol + "=>" + token0Symbol);
          amountsArray.push(amount1 + "=>" + Math.abs(amount0));
        } else {
          tokenPath.push(token0Symbol + "=>" + token1Symbol);
          amountsArray.push(amount0 + "=>" + Math.abs(amount1));
        }
        break;
      case curveSwapSignature:
        swapEventCount++;
        dexPath.push("Curve");
        break;
      case curveSwapSignatureNew:
        swapEventCount++;
        dexPath.push("CurveNew");
        break;
      case DODOSwapSignature:
        swapEventCount++;
        dexPath.push("DODOSwap");
        break;
      case MDEXV3SwapSignature:
        swapEventCount++;
        dexPath.push("MDEXV3");
        break;
      case NerveSignature:
        swapEventCount++;
        dexPath.push("Nerve");
        break;
      case balancerSwapSignature:
        swapEventCount++;
        dexPath.push("Balancer");

        try {
          tokenInContract = new ethers.Contract(
            `0x${log.topics[2].slice(26)}`,
            erc20Abi,
            provider
          );
          tokenOutContract = new ethers.Contract(
            `0x${log.topics[3].slice(26)}`,
            erc20Abi,
            provider
          );
          [tokenInSymbol, tokenOutSymbol, tokenInDecimals, tokenOutDecimals] =
            await Promise.all([
              tokenInContract.symbol(),
              tokenOutContract.symbol(),
              tokenInContract.decimals(),
              tokenOutContract.decimals(),
            ]);
        } catch (error) {
          tokenInSymbol = "TokenIn_InterfaceIssue";
          tokenOutSymbol = "TokenOut_InterfaceIssue";
          tokenInDecimals = 18;
          tokenOutDecimals = 18;
        }

        amounts = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256", "uint256"],
          log.data
        );

        tokenPath.push(tokenInSymbol + "=>" + tokenOutSymbol);
        amountsArray.push(
          ethers.formatUnits(amounts[0], tokenInDecimals) +
            "=>" +
            ethers.formatUnits(amounts[1], tokenOutDecimals)
        );

        break;

      case oneInchSwapSignature:
        swapEventCount++;
        dexPath.push("1inch");
        break;
      case kyberSwapSignature:
        swapEventCount++;
        dexPath.push("Kyber");
        break;
      case dydxTradeSignature:
        swapEventCount++;
        dexPath.push("dYdX");
        break;
      case swapEventSignatureSmardex:
        swapEventCount++;
        pairContract = new ethers.Contract(pairAddress, V2Abi, provider);

        try {
          factoryAddress = await pairContract.factory();
          dexPath.push(getDexNameByAddress(factoryAddress));
          if (getDexNameByAddress(factoryAddress) == "Unknown") {
            newDexes.push(factoryAddress);
            await addFactory(
              `NewFactory${Object.keys(dexFactories).length}`,
              factoryAddress
            );
          }
        } catch (error) {
          dexPath.push("smardex interface issue");
        }

        try {
          [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
          ]);
          token0Contract = new ethers.Contract(
            token0Address,
            erc20Abi,
            provider
          );
          token1Contract = new ethers.Contract(
            token1Address,
            erc20Abi,
            provider
          );
          [token0Symbol, token1Symbol, token0Decimals, token1Decimals] =
            await Promise.all([
              token0Contract.symbol(),
              token1Contract.symbol(),
              token0Contract.decimals(),
              token1Contract.decimals(),
            ]);
        } catch (error) {
          token0Symbol = "Token0_InterfaceIssue";
          token1Symbol = "Token1_InterfaceIssue";
          token0Decimals = 18;
          token1Decimals = 18;
        }

        amounts = ethers.AbiCoder.defaultAbiCoder().decode(
          ["int256", "int256"],
          log.data
        );

        amount0 = ethers.formatUnits(amounts[0], token0Decimals);
        amount1 = ethers.formatUnits(amounts[1], token1Decimals);
        if (Number(amount0) < 0) {
          tokenPath.push(token1Symbol + "=>" + token0Symbol);
          amountsArray.push(amount1 + "=>" + Math.abs(amount0));
        } else {
          tokenPath.push(token0Symbol + "=>" + token1Symbol);
          amountsArray.push(amount0 + "=>" + Math.abs(amount1));
        }
        break;
      default:
        break;
    }
  }

  // If at least two Swap events are found, return true for arbitrage
  if (swapEventCount >= 2) {
    return {
      hasSwapEvent: true,
      swapEventCount,
      dexPath,
      tokenPath,
      isValidPath: isPathValid(tokenPath),
      amountsArray,
      newDexes,
      venueAddresses,
      gasUsed: receipt.gasUsed,
    };
  }

  // If fewer than two Swap events are found, return false
  return {
    hasSwapEvent: false,
    swapEventCount,
    dexPath,
    tokenPath,
    isValidPath,
    amountsArray,
    newDexes,
    venueAddresses,
    gasUsed: receipt.gasUsed,
  };
}

// Fetch token prices from Kucoin API
async function fetchKucoinPrices() {
  try {
    const response = await axios.get(KUCOIN_API_URL);
    const tickerData = response.data.data.ticker;

    // Convert the response into a dictionary for quick access
    const priceMap = {};
    tickerData.forEach((item) => {
      priceMap[item.symbol] = parseFloat(item.last); // Using 'last' as the price reference
    });
    return priceMap;
  } catch (error) {
    console.error("Error fetching new prices:", error);
    return {};
  }
}

// Function to fetch prices from OKX API
async function fetchOkxPrices() {
  try {
    const response = await axios.get(OKX_API_URL);
    const tickers = response.data.data;
    const priceMap = {};

    tickers.forEach((item) => {
      const symbol = item.instId.replace("-", "");
      priceMap[symbol] = parseFloat(item.last);
    });
    return priceMap;
  } catch (error) {
    console.error("Error fetching OKX prices:", error);
    return {};
  }
}

// Function to fetch prices from Huobi API
async function fetchHuobiPrices() {
  try {
    const response = await axios.get(HUOBI_API_URL);
    const tickers = response.data.data;
    const priceMap = {};

    tickers.forEach((item) => {
      const symbol = item.symbol.toUpperCase();
      priceMap[symbol] = parseFloat(item.close);
    });
    return priceMap;
  } catch (error) {
    console.error("Error fetching Huobi prices:", error);
    return {};
  }
}

// Function to fetch all prices and combine them
async function fetchAllPrices() {
  const [okxPrices, huobiPrices, kucoinPrices] = await Promise.all([
    fetchOkxPrices(),
    fetchHuobiPrices(),
    fetchKucoinPrices(),
  ]);

  // Combine the prices with a fallback mechanism
  const combinedPrices = {};

  // Merge prices from all sources
  const allSymbols = new Set([
    ...Object.keys(okxPrices),
    ...Object.keys(huobiPrices),
    ...Object.keys(kucoinPrices),
  ]);

  allSymbols.forEach((symbol) => {
    combinedPrices[symbol] =
      okxPrices[symbol] || huobiPrices[symbol] || kucoinPrices[symbol] || 0;
  });

  return combinedPrices;
}

// Function to add USD amounts to the transaction array
async function addUsdAmounts(tokens, priceMap) {
  // Map over the transactions to add the usdAmount field
  return tokens.map((token) => {
    // Handle special case for WBNB -> BNB
    token.symbol === "WBNB" && (token.symbol = "BNB");
    const symbolToUSDT = `${token.symbol}-USDT`;
    const symbolToUSDC = `${token.symbol}-USDC`;
    const symbolToUSD = `${token.symbol}-USD`;

    // Fetch the price from the new API price map
    const priceInUSD =
      priceMap[symbolToUSDT] ||
      priceMap[symbolToUSDC] ||
      priceMap[symbolToUSD] ||
      0;

    // Calculate the USD amount based on the amount and the price
    const usdAmount = priceInUSD ? token.amount * priceInUSD : 0;

    // Return a new object with the additional field
    return {
      ...token,
      usdAmount: parseFloat(usdAmount.toFixed(6)), // Round to 6 decimal places
    };
  });
}

// Function to get tokens involved in a transaction
async function getTokensInTransaction(txHash, priceMap) {
  const transferEventSignature = ethers.id("Transfer(address,address,uint256)");

  try {
    // Fetch the transaction receipt using the hash
    const receipt = await provider.getTransactionReceipt(txHash);

    let tokens = [];

    // Loop through the logs and filter out Transfer events
    for (const log of receipt.logs) {
      // Check if the log corresponds to the ERC-20 Transfer event
      if (log.topics[0] === transferEventSignature) {
        // Decode the log data
        const amount = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256"],
          log.data
        )[0];

        const from = `0x${log.topics[1].slice(26)}`; // Extract 'from' address from the first topic
        const to = `0x${log.topics[2].slice(26)}`; // Extract 'to' address from the second topic

        const contract = new ethers.Contract(log.address, erc20Abi, provider);
        const decimals = await contract.decimals();

        // Push token details to the tokens array
        tokens.push({
          name: await contract.name(),
          symbol: await contract.symbol(),
          tokenAddress: log.address,
          from,
          to,
          amount: Number(ethers.formatUnits(amount, decimals)),
        });
      }
    }

    tokens = addUsdAmounts(tokens, priceMap);
    return tokens;
  } catch (error) {
    console.error("Error fetching tokens from transaction:", error);
    return [];
  }
}

// Function to getBalanceChanges
async function getBalanceChanges(txHash, priceMap) {
  let tokens = await getTokensInTransaction(txHash, priceMap);

  const result = [];

  // Helper function to find or create an account entry
  function findOrCreateAccount(account) {
    let entry = result.find((item) => item.account === account);
    if (!entry) {
      entry = { account, assets: [] };
      result.push(entry);
    }
    return entry;
  }

  // Helper function to find or create an asset entry
  function findOrCreateAsset(assets, tokenAddress) {
    let asset = assets.find((item) => item.address === tokenAddress);
    if (!asset) {
      asset = { address: tokenAddress, amount: "0", value: 0 };
      assets.push(asset);
    }
    return asset;
  }

  // Iterate through each transfer
  tokens.forEach((token) => {
    // Handle 'from' account entry
    const fromAccountEntry = findOrCreateAccount(token.from);
    const fromAssetEntry = findOrCreateAsset(
      fromAccountEntry.assets,
      token.tokenAddress
    );
    fromAssetEntry.amount = fromAssetEntry.amount - token.amount;
    fromAssetEntry.value -= token.usdAmount || 0;

    // Handle 'to' account entry
    const toAccountEntry = findOrCreateAccount(token.to);
    const toAssetEntry = findOrCreateAsset(
      toAccountEntry.assets,
      token.tokenAddress
    );
    toAssetEntry.amount = toAssetEntry.amount + token.amount;
    toAssetEntry.value += token.usdAmount || 0;
  });

  return result;
}

// Function to compute the difference between positive and negative values
function computeUsdDifference(balanceChanges) {
  let valuePositive = 0;
  let valueNegative = 0;

  for (const asset of balanceChanges.assets) {
    const value = Number(asset.value); // Get the value of the asset
    if (value === 0) return "one token without quote";
    if (Number(asset.amount) >= 0) {
      valuePositive += value; // Treat positive amounts as positive values
    } else {
      valueNegative += value; // Treat negative amounts as negative values
    }
  }

  // Calculate the difference: sum of positive values - sum of negative values
  const difference = valuePositive + valueNegative;
  return difference;
}

// Function to trace internal transactions
async function getInternalTransactions(txHash) {
  try {
    // Call debug_traceTransaction
    const trace = await provider.send("debug_traceTransaction", [
      txHash,
      {
        tracer: "callTracer",
      },
    ]);

    // Array of builder configurations
    const builders = [
      { name: "Puissant", addresses: BUILDER_PUISSANT_ADDRESSES },
      { name: "Jetbldr", addresses: BUILDER_JETBLDR_ADDRESSES },
      { name: "Txboost", addresses: BUILDER_TXBOOST_ADDRESSES },
      { name: "Nodereal", addresses: BUILDER_NODEREAL_ADDRESSES },
      { name: "Blocksmith", addresses: BUILDER_BLOCKSMITH_ADDRESSES },
      { name: "BlockRazor", addresses: BUILDER_BLOCKRAZOR_ADDRESSES },
      { name: "Bloxroute", addresses: BUILDER_BLOXROUTE_ADDRESSES },
    ];

    for (const log of trace.calls) {
      if (log.type === "CALL" && log?.value) {
        const to = log.to;
        const value = ethers.formatEther(BigInt(log.value)); // Extract value

        // If value is not zero, process the transaction
        if (Number(value) !== 0) {
          const normalizedTo = to.toLowerCase();

          // Loop through builders to find a match
          for (const builder of builders) {
            if (builder.addresses.includes(normalizedTo)) {
              console.log(
                `${builder.name.toUpperCase()} PAYMENT: To: ${to}, Amount: ${value} BNB`
              );

              return {
                builder: builder.name,
                toBuilder: to,
                paymentValue: Number(value),
              };
            }
          }
        }
      }
    }

    return {
      builder: "",
      toBuilder: "",
      paymentValue: 0,
    };
  } catch (error) {
    console.error("Error fetching internal transactions:", error.message);
  }
}

// Function to get builder payment transactions
async function getBuilderPaymentTransactionsOnTransfer(to, value) {
  try {
    // Switch-based logic
    if (Number(value) !== 0) {
      const builders = [
        { name: "Puissant", addresses: BUILDER_PUISSANT_ADDRESSES },
        { name: "Jetbldr", addresses: BUILDER_JETBLDR_ADDRESSES },
        { name: "Txboost", addresses: BUILDER_TXBOOST_ADDRESSES },
        { name: "Nodereal", addresses: BUILDER_NODEREAL_ADDRESSES },
        { name: "Blocksmith", addresses: BUILDER_BLOCKSMITH_ADDRESSES },
        { name: "BlockRazor", addresses: BUILDER_BLOCKRAZOR_ADDRESSES },
        { name: "Bloxroute", addresses: BUILDER_BLOXROUTE_ADDRESSES },
      ];

      const normalizedTo = to.toLowerCase();
      for (const builder of builders) {
        if (builder.addresses.includes(normalizedTo)) {
          console.log(
            `${builder.name.toUpperCase()} SINGLE PAYMENT: To: ${to}, Amount: ${value} BNB`
          );
          return {
            builderTransfer: builder.name,
            toBuilderTransfer: to,
            paymentValueTransfer: Number(value),
          };
        }
      }
    }

    return {
      builderTransfer: "",
      toBuilderTransfer: "",
      paymentValueTransfer: 0,
    };
  } catch (error) {
    console.error("Error fetching internal transactions:", error.message);
  }
}

function formatBalances(balances) {
  return balances.reduce((acc, item) => {
    acc[item.symbol] = Number(item.balance);
    return acc;
  }, {});
}

function detectMEV(logDataArray, allTxDetails) {
  // Create a copy of logDataArray with default arbitrage
  const processedLogArray = logDataArray.map((item) => ({
    ...item,
  }));

  // Find corresponding logDataArray element by position
  function findByPosition(positionInBlock) {
    return processedLogArray.findIndex(
      (log) => log.position === positionInBlock
    );
  }

  // Iterate through all transactions
  for (let i = 0; i < allTxDetails.length - 2; i++) {
    if (i > 18) break; // equivalence to 6 sandwiches, I don't believe we've sandwiches after
    if (
      allTxDetails[i].to === allTxDetails[i + 2].to &&
      allTxDetails[i].to != allTxDetails[i + 1].to // no sequential txns to the same account
    ) {
      // Get indices in processedLogArray
      const firstIdx = findByPosition(i);
      const middleIdx = findByPosition(i + 1);
      const lastIdx = findByPosition(i + 2);

      if (
        processedLogArray[middleIdx]?.payment_value_usd > 0 ||
        !processedLogArray[firstIdx]?.paymentValue ||
        !processedLogArray[lastIdx]?.paymentValue
      )
        break; // no MEV if payment value is positive for victim or no bribe for attacker

      // Update MEV type if transactions are in our processedLogArray
      if (firstIdx !== -1) {
        processedLogArray[firstIdx].mev = {
          type: "sandwich",
          role: "attacker",
          txn: "first",
          indexLast: i + 2,
          indexVictim: i + 1,
        };
      }

      if (middleIdx !== -1) {
        processedLogArray[middleIdx].mev = {
          type: "sandwich",
          role: "victim",
          indexAttackerFirst: i,
          indexAttackerLast: i + 2,
        };
      }

      if (lastIdx !== -1) {
        processedLogArray[lastIdx].mev = {
          type: "sandwich",
          role: "attacker",
          txn: "last",
          indexFirst: i,
          indexVictim: i + 1,
        };
      }

      i += 2;
    }
  }

  return processedLogArray;
}

// Updated main function
async function processBlockTransactions(blockNumber) {
  let totalArbitrageCount = 0;
  let [transactions, priceMap] = await Promise.all([
    fetchTransactions(blockNumber),
    fetchAllPrices(),
  ]);

  let sum = 0;
  let logDataArray = [];
  let allTxDetails = [];

  for (let i = 0; i < transactions.length; i++) {
    let revenueUsdBis = 0;
    const txHash = transactions[i];

    const txDetails = await provider.getTransaction(txHash);
    allTxDetails.push(txDetails);
    const gasLimit = txDetails.gasLimit;
    const gasPrice = txDetails.gasPrice;
    const toAddress = txDetails?.to; // error pop out
    const fromAddress = txDetails?.from;
    const value = ethers.formatEther(BigInt(txDetails.value)); // Extract value
    const nonce = txDetails.nonce;

    const {
      hasSwapEvent,
      swapEventCount,
      dexPath,
      newDexes,
      tokenPath,
      amountsArray,
      isValidPath,
      venueAddresses,
      gasUsed,
    } = await containsArbitrage(txHash);

    let txnFees;
    if (gasUsed) {
      txnFees = Number(gasUsed) * Number(ethers.formatEther(gasPrice));
    }
    let txnFeesUsd = txnFees * priceMap["BNB-USDT"];

    let { builderTransfer, toBuilderTransfer, paymentValueTransfer } =
      await getBuilderPaymentTransactionsOnTransfer(toAddress, value);

    if (paymentValueTransfer > 0) {
      const logDataPaymentTransfer = {
        timestamp: getTimestamp(),
        level: "INFO",
        _type: "MevSinglePayment",
        _appid: "adfl_bsc_mev_analyse",
        from: fromAddress,
        to: toAddress,
        txn_hash: txHash,
        block_number: Number(blockNumber),
        position: i,
        nonce,
        is_single_transfer: true,
        data: txDetails.data,
        gas_limit: Number(gasLimit.toString()),
        gas_price: Number(ethers.formatUnits(gasPrice, 9)), //Gwei
        gas_used: Number(gasUsed?.toString()),
        txn_fees: Number(txnFees),
        txn_fees_usd: txnFeesUsd,
        builder: builderTransfer,
        toBuilder: toBuilderTransfer,
        payment_value: paymentValueTransfer,
        payment_value_usd: paymentValueTransfer * priceMap["BNB-USDT"],
      };

      writeToLogFile(logDataPaymentTransfer);
    }

    if (!hasSwapEvent) continue;

    const balanceChanges = await getBalanceChanges(txHash, priceMap);

    const toAddressBalanceChange = balanceChanges.find(
      (change) => change.account.toLowerCase() === toAddress?.toLowerCase()
    );

    const toBalanceDifference = toAddressBalanceChange
      ? computeUsdDifference(toAddressBalanceChange)
      : 0;

    const fromAddressBalanceChange = balanceChanges.find(
      (change) => change.account.toLowerCase() === toAddress?.toLowerCase()
    );

    const fromBalanceDifference = fromAddressBalanceChange
      ? computeUsdDifference(fromAddressBalanceChange)
      : 0;

    if (typeof toBalanceDifference === "number") {
      sum += toBalanceDifference;
    }
    if (typeof fromBalanceDifference === "number") {
      sum += fromBalanceDifference;
    }

    if (
      toAddressBalanceChange ||
      toBalanceDifference === 0 ||
      fromBalanceDifference ||
      fromBalanceDifference === 0
    ) {
      let { builder, toBuilder, paymentValue } = await getInternalTransactions(
        txHash
      );

      totalArbitrageCount++;

      let usdPaymentValue = paymentValue * priceMap["BNB-USDT"];

      let uniqueFormatted = getUniqueFormattedPairs(dexPath, tokenPath);

      let amountInRate = tokenPath[0].split("=>")[0].includes("USD")
        ? 1
        : priceMap[
            tokenPath[0].split("=>")[0] === "WBNB"
              ? "BNB-USDT"
              : tokenPath[0].split("=>")[0] + "-USDT"
          ];

      let amountOutRate = tokenPath[tokenPath.length - 1]
        .split("=>")[1]
        .includes("USD")
        ? 1
        : priceMap[
            tokenPath[tokenPath.length - 1].split("=>")[1] === "WBNB"
              ? "BNB-USDT"
              : tokenPath[tokenPath.length - 1].split("=>")[1] + "-USDT"
          ];

      let amount_in_usd_solo =
        Number(amountsArray?.[0]?.split("=>")[0]) * amountInRate;
      let amount_out_usd_solo =
        Number(amountsArray?.[amountsArray.length - 1]?.split("=>")[1]) *
        amountOutRate;

      let tokenIn = tokenPath[0].split("=>")[0];
      let tokenOut = tokenPath[tokenPath.length - 1].split("=>")[1];

      if (
        amount_out_usd_solo &&
        amount_out_usd_solo != 0 &&
        amount_in_usd_solo &&
        amount_in_usd_solo != 0
      ) {
        if (amount_out_usd_solo == amount_in_usd_solo) {
          revenueUsdBis =
            typeof toBalanceDifference == "number" ? toBalanceDifference : 0;
        } else {
          revenueUsdBis = amount_out_usd_solo - amount_in_usd_solo;
        }
      }

      const { totalValue, balances } = await getOurBotUsdBalance(priceMap);

      let botBalance =
        toAddress.toLowerCase() === OUR_CONTRACT_ADDRESS
          ? Number(totalValue)
          : 0;

      let revenueUsd =
        dexPath.length == tokenPath.length ? Number(toBalanceDifference) : 0;

      let profitUsd =
        dexPath.length == tokenPath.length
          ? revenueUsd - txnFeesUsd - usdPaymentValue
          : 0;

      let profitUsdBis =
        dexPath.length == tokenPath.length
          ? revenueUsdBis - txnFeesUsd - usdPaymentValue
          : 0;

      const logData = {
        ...{
          timestamp: getTimestamp(),
          level: "INFO",
          _type: "MevAnalyse",
          _appid: "adfl_bsc_mev_analyse",
          from: fromAddress,
          to: toAddress,
          txn_hash: txHash,
          is_path_valid: dexPath.length == tokenPath.length && isValidPath,
          block_number: Number(blockNumber),
          position: i,
          nonce,
          gas_limit: Number(gasLimit.toString()),
          gas_price: Number(ethers.formatUnits(gasPrice, 9)), //Gwei
          gas_used: Number(gasUsed.toString()),
          txn_fees: Number(txnFees),
          txn_fees_usd: txnFeesUsd,
          token_path: tokenPath,
          venue_path: dexPath,
          new_dex: newDexes,
          hot_pairs: uniqueFormatted,
          token_in_bis: tokenIn,
          token_out_bis: tokenOut,
          venues_addresses: venueAddresses,
          is_new_dex_verified:
            newDexes.length > 0 ? await checkContractsVerified(newDexes) : null,
          nb_swap: swapEventCount,
          amount_in_solo: Number(amountsArray?.[0]?.split("=>")[0]),
          amount_out_solo: Number(
            amountsArray?.[amountsArray.length - 1]?.split("=>")[1]
          ),
          amount_in_usd_solo:
            Number(amountsArray?.[0]?.split("=>")[0]) * amountInRate,
          amount_out_usd_solo:
            Number(amountsArray?.[amountsArray.length - 1]?.split("=>")[1]) *
            amountOutRate,
          amount_in: amountsArray?.[0],
          amount_out: amountsArray?.[amountsArray.length - 1] || 0,
          revenue_usd: revenueUsd,
          profit_usd: profitUsd,
          revenue_usd_bis: revenueUsdBis,
          profit_usd_bis: profitUsdBis,
          percentage_revenue_bis: 100 * (txnFeesUsd / revenueUsdBis),
        },
        ...(botBalance > 0
          ? { bot_balance: botBalance, botBalances: formatBalances(balances) }
          : {}),
        ...(paymentValue > 0
          ? {
              builder,
              toBuilder,
              payment_value: paymentValue,
              payment_value_usd: usdPaymentValue,
              percentage_payment_bis:
                100 * (usdPaymentValue / (revenueUsdBis - txnFeesUsd)),
            }
          : {}),
      };

      logDataArray.push(logData);

      console.log(JSON.stringify(logData));
    }
  }
  const logDataArray2 = detectMEV(logDataArray, allTxDetails);
  for (const logData of logDataArray2) writeToLogFile(logData);

  console.log("Finished block processing", blockNumber);
  console.log(
    "* * * * * * * TOTAL NUMBER OF ARBITRAGE FOUND:",
    totalArbitrageCount
  );
  console.log("* * * * * * * SUM OF EXTRACTIBLE VALUE:", sum);
}

provider.on("block", async (blockNumber) => {
  console.log(`||| New Block Detected: ${blockNumber}`);
  console.time("Processing Time");
  await processBlockTransactions(blockNumber);
  console.timeEnd("Processing Time");
  console.log("\n\n");
});
