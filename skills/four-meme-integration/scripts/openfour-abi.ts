// Selected public OpenFour ABI entries from four-meme-community/openfour-docs/scripts/abi.
// Keep these synchronized with the official artifacts when contracts change.

export const OPENFOUR_REGISTRY_ABI = [
  {
    "inputs": [],
    "name": "openFourCore",
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
    "name": "openFourTool",
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

export const OPENFOUR_TOOLS_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "presetId",
        "type": "uint256"
      }
    ],
    "name": "getPresetEncodeSchemas",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "kind",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "version",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abiType",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "optional",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "title",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "defaultValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "hint",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "minValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "maxValue",
                "type": "string"
              }
            ],
            "internalType": "struct ParamDescriptor[]",
            "name": "params",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct ModuleEncodeSchema",
        "name": "tokenSchema",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "kind",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "version",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abiType",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "optional",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "title",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "defaultValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "hint",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "minValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "maxValue",
                "type": "string"
              }
            ],
            "internalType": "struct ParamDescriptor[]",
            "name": "params",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct ModuleEncodeSchema",
        "name": "vaultSchema",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "kind",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "version",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abiType",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "optional",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "title",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "defaultValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "hint",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "minValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "maxValue",
                "type": "string"
              }
            ],
            "internalType": "struct ParamDescriptor[]",
            "name": "params",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct ModuleEncodeSchema",
        "name": "curveSchema",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "kind",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "version",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abiType",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "optional",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "title",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "defaultValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "hint",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "minValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "maxValue",
                "type": "string"
              }
            ],
            "internalType": "struct ParamDescriptor[]",
            "name": "params",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct ModuleEncodeSchema",
        "name": "tradeSchema",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "kind",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "version",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abiType",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "optional",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "title",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "defaultValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "hint",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "minValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "maxValue",
                "type": "string"
              }
            ],
            "internalType": "struct ParamDescriptor[]",
            "name": "params",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct ModuleEncodeSchema",
        "name": "migrateSchema",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "kind",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "version",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abiType",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "optional",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "title",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "defaultValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "hint",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "minValue",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "maxValue",
                "type": "string"
              }
            ],
            "internalType": "struct ParamDescriptor[]",
            "name": "params",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct ModuleEncodeSchema",
        "name": "customDataSchema",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenBaseSchema",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "abiType",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "optional",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "defaultValue",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "hint",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "minValue",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "maxValue",
            "type": "string"
          }
        ],
        "internalType": "struct ParamDescriptor[]",
        "name": "p",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  }
] as const;

export const OPENFOUR_CORE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "requestId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "presetId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxSupply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "saleAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "raiseAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "initialPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "quoteAsset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "vault",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "curveModule",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tradeModule",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "migrateModule",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "customData",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenModule",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "tokenMetaUri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "flags",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "encodedTags",
        "type": "bytes"
      }
    ],
    "name": "TokenCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "createArgs",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "createToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
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
  }
] as const;
