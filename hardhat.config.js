require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()



const RIKEBY_RPC_URL = process.env.RIKEBY_RPC_URL || ""
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork:"hardhat", 
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations:1
  },
    rinkeby: {
      url:RIKEBY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId:4,
      blockConfirmations:6
     },
  },
  solidity: "0.8.7",
  namedAccounts: {
    deployer: {
      default: 0
    },
    player: {
      default: 1 
    }
  },
  etherscan: {
    // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
        rinkeby: ETHERSCAN_API_KEY
    },
},
  gasReporter : {
    enabled:false,
    outputFile:'gas-report.txt',
    noColors:true,
    currency:"USD"
  }, 
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
},
};
