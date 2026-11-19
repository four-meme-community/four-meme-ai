// Selected public ABI entries from four-meme-community/openfour-docs/scripts/abi.
export const OPENFOUR_TRADE_CORE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxPayAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "options",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "buy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxPayAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "options",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "buyByBudget",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minReceiveAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "options",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "sell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "tokens",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "presetId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "maxSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "saleAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "raiseAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteAsset",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "vault",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "curveModule",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tradeModule",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "migrateModule",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenModule",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "customData",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "createBlock",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "antiSniperEnabled",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "wrappedNative",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "zapRouter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const OPENFOUR_TRADE_TOOLS_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "options",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "estimateBuy",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "curveQuote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userPays",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userReceives",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionPrice",
            "type": "uint256"
          }
        ],
        "internalType": "struct TradeEstimate",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxPayAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "options",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "estimateBuyByBudget",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "curveQuote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userPays",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userReceives",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionPrice",
            "type": "uint256"
          }
        ],
        "internalType": "struct TradeEstimate",
        "name": "estimate",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "options",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "estimateSell",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "curveQuote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userPays",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userReceives",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionPrice",
            "type": "uint256"
          }
        ],
        "internalType": "struct TradeEstimate",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const OPENFOUR_TRADE_REGISTRY_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "presetId",
        "type": "uint256"
      }
    ],
    "name": "isPresetActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const OPENFOUR_TRADE_VAULT_ABI = [
  {
    "inputs": [],
    "name": "phase",
    "outputs": [
      {
        "internalType": "enum OpenFourTypes.Phase",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
