const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const IPC_PATH = "/data/bsc/geth.fast/geth.ipc";
const KUCOIN_API_URL = "https://api.kucoin.com/api/v1/market/allTickers";
const HUOBI_API_URL = "https://api.huobi.pro/market/tickers";
const OKX_API_URL = "https://www.okx.com/api/v5/market/tickers?instType=SPOT";
const PUISSANT_PAYMNET = "0x4848489f0b2bedd788c696e2d79b6b69d7484848";

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

// Factories addresseS
const dexFactories = {
  PancakeSwapV2: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  PancakeSwapV3: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
  BiswapV2: "0x858E3312ed3A876947EA49d572A7C42DE08af7EE",
  BiswapV3: "0x7C3d53606f9c03e7f54abdDFFc3868E1C5466863",
  UniswapV2: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
  UniswapV3: "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
  MDEX: "0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8",
  Apeswap: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
  SmarDex: "0xa8ef6fea013034e62e2c4a9ec1cdb059fe23af33",
  SquadSwapV2: "0x009c4ef7C0e0Dd6bd1ea28417c01Ea16341367c3",
  SquadSwapV3: "0x1D9F43a6195054313ac1aE423B1f810f593b6ac1",
  Bakeryswap: "0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7",
  BabySwap: "0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da",
  KnightSwap: "0xf0bc2E21a76513aa7CC2730C7A1D6deE0790751f",
  NomiSwap: "0xd6715a8be3944ec72738f0bfdc739d48c3c29349",
  JulSwap: "0x553990F2CBA90272390f62C5BDb1681fFc899675",
  Sushi: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
  Fraxswap: "0xf89e6CA06121B6d4370f4B196Ae458e8b969A011",
  Dooar: "0x1e895bFe59E3A5103e8B7dA3897d1F2391476f3c",
  BSCswap: "0xCe8fd65646F2a2a897755A1188C04aCe94D2B8D0",
  BabyDogeSwap: "0x4693B62E5fc9c0a45F89D62e6300a03C85f43137",
  EmpireDEX: "0x06530550A48F990360DFD642d2132354A144F31d",
  RadioShack: "0x98957ab49b8bc9f7ddbCfD8BcC83728085ecb238",
  ElkFinance: "0x31affd875e9f68cd6cd12cee8943566c9a4bba13",
  KaoyaSwap: "0xbFB0A989e12D49A0a3874770B1C1CdDF0d9162aA",
  FstSwap: "0x9a272d734c5a0d7d84e0a892e891a553e8066dce",
  PinkSwap: "0x7D2Ce25C28334E40f37b2A068ec8d5a59F11Ea54",
  BurgerSwap: "0x8a1e9d3aebbbd5ba2a64d3355a48dd5e9b511256",
  JetSwap: "0x0eb58E5c8aA63314ff5547289185cC4583DfCBD5",
  HyperJump: "0xaC653cE27E04C6ac565FD87F18128aD33ca03Ba2",
  CoinSwap: "0xC2D8d27F3196D9989aBf366230a47384010440c0",
  NarwhalSwap: "0xB9fA84912FF2383a617d8b433E926Adf0Dd3FEa1",
  IntercroneSwap: "0xFa51B0746eb96deBC619Fd2EA88d5D8B43BD8230",
  PantherSwap: "0x670f55c6284c629c23bae99f585e3f17e8b9fc31",
  PureSwap: "0x94b4188D143b9dD6bd7083aE38A461FcC6AAd07E",
  BearnFinance: "0x2c358a7c62cdb9d554a65a86eea034bc55d1e715",
  TitanoSwych: "0x80f112CD8Ac529d6993090A0c9a04E01d495BfBf",
  AlitaFinance: "0xC7a506ab3ac668EAb6bF9eCf971433D6CFeF05D9",
  GibxSwap: "0x97bCD9BB482144291D77ee53bFa99317A82066E8",
  WardenSwap: "0x3657952d7bA5A0A4799809b5B6fdfF9ec5B46293",
  Definix: "0x43eBb0cb9bD53A3Ed928Dd662095aCE1cef92D19",
  PlanetBlue: "0xa053582601214feb3778031a002135cbbb7dba18",
};

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

// Function to check if the transaction contains at least two "Swap" events (V2, V3, Curve, Balancer, 1inch, Kyber, dYdX)
async function containsArbitrage(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  const isSuccessful = receipt.status === 1 && Number(receipt.gasUsed) > 120000;

  // Initialize counters and path array
  let swapEventCount = 0;
  let dexPath = [];
  let tokenPath = [];
  let isValidPath = false;

  if (!isSuccessful)
    return {
      hasSwapEvent: false,
      swapEventCount,
      dexPath,
      tokenPath,
      isValidPath,
    };

  const logs = receipt.logs;

  // Define event signatures for various protocols
  const swapEventSignatureV2 = ethers.id(
    "Swap(address,uint256,uint256,uint256,uint256,address)"
  );
  const swapEventSignatureV3 = ethers.id(
    "Swap(address,address,int256,int256,uint160,uint128,int24)"
  );
  const curveSwapSignature = ethers.id(
    "TokenExchange(address,int128,uint256,int128,uint256)"
  );
  const balancerSwapSignature = ethers.id(
    "Swap(bytes32,address,address,uint256,uint256)"
  );
  const oneInchSwapSignature = ethers.id(
    "OrderFilled(address,address,uint256,uint256)"
  );
  const kyberSwapSignature = ethers.id(
    "KyberSwap(address,address,address,uint256,uint256)"
  );
  const dydxTradeSignature = ethers.id(
    "LogTrade(address,address,address,uint256,uint256)"
  );

  // Iterate through logs to identify the Swap events and their type
  for (const log of logs) {
    const pairAddress = log.address;
    let amountIn0, pairContract, factoryAddress;

    switch (log.topics[0]) {
      case swapEventSignatureV2:
        swapEventCount++;
        pairContract = new ethers.Contract(pairAddress, V2Abi, provider);

        try {
          factoryAddress = await pairContract.factory();
          dexPath.push(getDexNameByAddress(factoryAddress));
        } catch (error) {
          dexPath.push("V2 interface issue");
        }
        [token0Address, token1Address] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);

        token0Contract = new ethers.Contract(token0Address, erc20Abi, provider);
        token1Contract = new ethers.Contract(token1Address, erc20Abi, provider);
        [token0Symbol, token1Symbol] = await Promise.all([
          token0Contract.symbol(),
          token1Contract.symbol(),
        ]);

        amounts = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256", "uint256", "uint256", "uint256"],
          log.data
        );
        let amount0In = amounts[0];
        let amountIOut = amounts[3];
        if (amount0In != 0 && amountIOut != 0) {
          tokenPath.push(token0Symbol + "=>" + token1Symbol);
        } else {
          tokenPath.push(token1Symbol + "=>" + token0Symbol);
        }
        break;

      case swapEventSignatureV3:
        swapEventCount++;
        pairContract = new ethers.Contract(pairAddress, V3Abi, provider);

        try {
          factoryAddress = await pairContract.factory();
          dexPath.push(getDexNameByAddress(factoryAddress));
        } catch (error) {
          dexPath.push("V3 interface issue");
        }
        [token0Address, token1Address] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);
        token0Contract = new ethers.Contract(token0Address, erc20Abi, provider);
        token1Contract = new ethers.Contract(token1Address, erc20Abi, provider);
        [token0Symbol, token1Symbol] = await Promise.all([
          token0Contract.symbol(),
          token1Contract.symbol(),
        ]);

        amountIn0 = ethers.AbiCoder.defaultAbiCoder().decode(
          ["int256", "int256", "uint160", "uint128", "int24"],
          log.data
        )[0];

        if (Number(amountIn0) < 0) {
          tokenPath.push(token1Symbol + "=>" + token0Symbol);
        } else {
          tokenPath.push(token0Symbol + "=>" + token1Symbol);
        }
        break;

      case curveSwapSignature:
        swapEventCount++;
        dexPath.push("Curve");
        break;
      case balancerSwapSignature:
        swapEventCount++;
        dexPath.push("Balancer");
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
    };
  }

  // If fewer than two Swap events are found, return false
  return {
    hasSwapEvent: false,
    swapEventCount,
    dexPath,
    tokenPath,
    isPathValid,
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
function computeValueDifference(toOrFromBalanceChanges) {
  let valuePositive = 0;
  let valueNegative = 0;

  for (const asset of toOrFromBalanceChanges.assets) {
    const value = Number(asset.value); // Get the value of the asset
    if (Number(asset.amount) >= 0) {
      valuePositive += value; // Treat positive amounts as positive values
    } else {
      valueNegative += value; // Treat negative amounts as negative values
    }
  }

  // Calculate the difference: sum of positive values - sum of negative values
  const difference = valuePositive - valueNegative;
  return difference;
}

// Function to trace internal transactions
async function getInternalTransactions(txHash) {
  try {
    // Call debug_traceTransaction
    const trace = await provider.send("debug_traceTransaction", [txHash]);

    trace.structLogs.forEach((log) => {
      if (log.op === "CALL" && log.stack.length > 1) {
        const to = "0x" + log.stack[log.stack.length - 2].slice(-40); // Extract 'to' address
        const value = ethers.formatEther(
          BigInt(log.stack[log.stack.length - 3])
        ); // Extract value

        if (Number(value) != 0 && to === PUISSANT_PAYMNET) {
          console.log(
            `PUISSANT PAYMENT: To: ${to}, Amount: ${value} BNB at txHash: ${txHash}`
          );
        }
      }
    });
  } catch (error) {
    console.error("Error fetching internal transactions:", error.message);
  }
}

// Main function to execute the filtering process
async function processBlockTransactions(blockNumber) {
  let totalArbitrageCount = 0;
  let [transactions, priceMap] = await Promise.all([
    fetchTransactions(blockNumber),
    fetchAllPrices(),
  ]);

  let sum = 0;

  for (let i = 0; i < transactions.length; i++) {
    const txHash = transactions[i];

    // Get the transaction details to access the 'to' address
    const txDetails = await provider.getTransaction(txHash);
    const toAddress = txDetails.to;
    const fromAddress = txDetails.from;

    // Step 4: Filter transactions that contain the "Swap" event
    const { hasSwapEvent, swapEventCount, dexPath, tokenPath, isValidPath } =
      await containsArbitrage(txHash);

    if (!hasSwapEvent) continue;

    const balanceChanges = await getBalanceChanges(txHash, priceMap);

    // Step 6: Check if the 'to' or 'from' address has balance changes
    const toAddressBalanceChange = balanceChanges.find(
      (change) => change.account.toLowerCase() === toAddress.toLowerCase()
    );
    const toBalanceDifference = toAddressBalanceChange
      ? computeValueDifference(toAddressBalanceChange)
      : 0;

    const fromAddressBalanceChange = balanceChanges.find(
      (change) => change.account.toLowerCase() === fromAddress.toLowerCase()
    );
    const fromBalanceDifference = fromAddressBalanceChange
      ? computeValueDifference(fromAddressBalanceChange)
      : 0;

    if (toBalanceDifference > 0) {
      sum += toBalanceDifference;
    } else if (fromBalanceDifference > 0) {
      sum += fromBalanceDifference;
    }

    if (toAddressBalanceChange || fromAddressBalanceChange) {
      await getInternalTransactions(txHash);

      totalArbitrageCount++;
      console.log("--- Transaction Details", blockNumber);
      console.log("Position of the transaction in the block:", i);
      console.log("Transaction hash:", txHash);
      console.log("Bot address:", toAddress);
      console.log(
        "Profit in USD:",
        toBalanceDifference,
        " || ",
        fromBalanceDifference
      );
      console.log("Number of swaps:", swapEventCount);
      console.log("Dex path:", dexPath);
      console.log("Token path:", tokenPath);
      console.log("Is valid path: ", isValidPath, "\n\n");
    }
  }

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
