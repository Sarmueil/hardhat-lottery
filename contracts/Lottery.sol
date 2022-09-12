//users should be able to enter the lottery
//a random user should be picked for winning after some time

// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughFunds();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Lottery__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

/**@title A sample Lottery Contract
 * @author Samuel Adebisi
 * @notice This contract is for creating a sample Lottery contract
 * @dev This implements the Chainlink VRF Version 2
 */

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum LotteryState {
        OPEN,
        CALCULATING
    }
    //minimum fee to enter lottery
    uint256 private immutable i_entranceFee;
    //array of address of players
    address payable[] private s_players; //storage variable

    //Lottery variables
    address private s_luckyWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    //events
    event LotteryEnter(address indexed player);

    //the request random words events returns a uint256 number  which i need an event to emit it
    event RequestedLotteryWinner(uint256 indexed requestId);

    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 enteranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = enteranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    //create a function for funding / entering the lottery

    function enterLottery() public payable {
        //to check if the amount funded is less that enterance fee
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughFunds();
        }
        //keeps track of when the lottery is open and if it is not open the user will not be bale to enter the lottery
        if (s_lotteryState != LotteryState.OPEN) {
            revert Raffle__NotOpen();
        }
        //pushing the address that paid into the players array
        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    //check upkeep to know when it is time to request a new randowm winner;
    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */

    //making checkUpkeep function public to allow this contract to call it when needed
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        //to check if the lottery is open
        bool isOpen = (LotteryState.OPEN == s_lotteryState);
        // to check if the time for the upkeep is right
        bool timeElasped = ((block.timestamp - s_lastTimeStamp) > i_interval);
        //to check if there are players in the lottery
        bool hasPlayers = (s_players.length > 0);
        //to see if there is enough ETH/funds
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timeElasped && hasPlayers && hasBalance);
    }

    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        //to check when we need to call the checkUpkeep function
        (bool upkeepNeeded, ) = checkUpkeep("");
        //to make sure that upkeep is needed
        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }
        s_lotteryState = LotteryState.CALCULATING;
        // call the request random words from the chainlink vrf request random words functions
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        // this is redundant as vrfCoordinator emits an event with the request Id in it
        emit RequestedLotteryWinner(requestId);
    }

    /**
     * @dev This is the function that Chainlink VRF node
     * calls to send the money to the random winner.
     */

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        //pick a random winner from the array of players
        //represents the index
        uint256 indexNumber = randomWords[0] % s_players.length;
        // use the index to get the index of the winner from the players array
        //gettinb address
        address payable luckyWinner = s_players[indexNumber];
        s_luckyWinner = luckyWinner;
        s_lotteryState = LotteryState.OPEN;
        //empty/reset the players array after the winner has been mentioned....
        s_players = new address payable[](0);
        // function to withdraw the funds in this contact by the winner
        //resset the timestamp
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = luckyWinner.call{value: address(this).balance}("");
        //custom error to handle faile trasactions.
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(luckyWinner);
    }

    //function to allow users view the enterance fee
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    // to get individual players in the array
    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_luckyWinner;
    }

    //to to get the lottery state
    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    //a pure function because it is not reading directly from storage, more of a constant functions
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    //to get the number of players
    function getNumPlayers() public view returns (uint256) {
        return s_players.length;
    }

    //to get the latest timestamp
    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
