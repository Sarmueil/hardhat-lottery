const { network, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');

const FUND_AMOUNT = ethers.utils.parseEther('30')
// const { verify } = require("../utils/verify")

module.exports= async function ({deployments, getNamedAccounts}) {
    const {deploy, log} = deployments 
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorAddress, subscriptionId

    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"] 
    const interval = networkConfig[chainId]["interval"]

    if(developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
        vrfCoordinatorAddress = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        //to get subscription Id
        subscriptionId =  transactionReceipt.events[0].args.subId
        //required to fund subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    }else{
        vrfCoordinatorAddress = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const arguments = [
        vrfCoordinatorAddress,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        // networkConfig[chainId]["keepersUpdateInterval"], 
        networkConfig[chainId]["entranceFee"],
        networkConfig[chainId]["callbackGasLimit"], 
        networkConfig[chainId]["interval"]
    ]

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const args = [vrfCoordinatorAddress, entranceFee, gasLane, subscriptionId, callbackGasLimit,interval]

    const lottery = await deploy ('Lottery', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`Lottery deployed at ${lottery.address}`)

     // Verify the deployment
    //  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     log("Verifying...")
    //     await verify(lottery.address, arguments)
    // }
}

module.exports.tags = ["all", "lottery"]