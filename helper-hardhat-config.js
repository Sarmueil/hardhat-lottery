const { ethers } = require('hardhat')

const networkConfig = {
    // 31337: {
    //     name: "localhost",
    // },
    // Price Feed Address, values can be obtained at https://docs.chain.link/docs/reference-contracts
    // Default one is ETH/USD contract on Kovan
    // 42: {
    //     name: "kovan",
    //     ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
    // },
    4: {
        name: "rinkeby",
        vrfCoordinatorV2 : "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee:ethers.utils.parseEther("0.01"),
        gasLane:"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "22053",
        callbackGasLimit:"500000",
        interval:"30"
    },
    31337: {
        name: "hardhat",
        entranceFee:ethers.utils.parseEther("0.01"),
        gasLane:"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit:"500000",
        interval:"30"
    },
}

const developmentChains = ["hardhat", "localhost"]

 
module.exports = {
    networkConfig,
    developmentChains
}