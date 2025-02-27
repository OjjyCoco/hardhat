// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Voting contract for proposals
/// @author Alyra
/// @notice A contract that allows users to submit proposals and vote for proposals
/// @dev The winning proposal is the one that receives the highest number of votes.
/// @dev Users can vote only once. The owner must register voters.
contract Voting is Ownable {

    uint public winningProposalID;
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public workflowStatus;
    Proposal[] proposalsArray;
    mapping (address => Voter) voters;

    event VoterRegistered(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

    constructor() Ownable(msg.sender) { }
    
    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a voter");
        _;
    }

    /// @notice Get the voter information
    /// @dev Returns the Voter structure with its attributes
    /// @param _addr The address of the voter
    /// @return Voter structure containing registration status, voting status, and voted proposal ID
    function getVoter(address _addr) external onlyVoters view returns (Voter memory) {
        return voters[_addr];
    }
    
    /// @notice Get the proposal information
    /// @dev Returns a proposal by its ID
    /// @param _id The ID of the proposal
    /// @return Proposal structure containing description and vote count
    function getOneProposal(uint _id) external onlyVoters view returns (Proposal memory) {
        return proposalsArray[_id];
    }

    /// @notice Register a new voter
    /// @dev Only the contract owner can register voters during the voter registration phase
    /// @param _addr The address of the voter to be registered
    function addVoter(address _addr) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
        require(voters[_addr].isRegistered != true, 'Already registered');
    
        voters[_addr].isRegistered = true;
        emit VoterRegistered(_addr);
    }

    /// @notice Submit a new proposal
    /// @dev Only registered voters can submit proposals during the proposal registration phase
    /// @param _desc The description of the proposal
    function addProposal(string calldata _desc) external onlyVoters {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Proposals are not allowed yet');
        require(keccak256(abi.encode(_desc)) != keccak256(abi.encode("")), 'Vous ne pouvez pas ne rien proposer');

        Proposal memory proposal;
        proposal.description = _desc;
        proposalsArray.push(proposal);

        emit ProposalRegistered(proposalsArray.length-1);
    }

    /// @notice Vote for a proposal
    /// @dev Only registered voters can vote once during the voting phase
    /// @param _id The ID of the proposal to vote for
    function setVote(uint _id) external onlyVoters {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        require(voters[msg.sender].hasVoted != true, 'You have already voted');
        require(_id < proposalsArray.length, 'Proposal not found');

        voters[msg.sender].votedProposalId = _id;
        voters[msg.sender].hasVoted = true;
        proposalsArray[_id].voteCount++;

        emit Voted(msg.sender, _id);
    }

    /// @notice Start the proposal registration phase
    /// @dev Only the contract owner can initiate this phase after voter registration
    function startProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Registering proposals cant be started now');
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        
        Proposal memory proposal;
        proposal.description = "GENESIS";
        proposalsArray.push(proposal);
        
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    /// @notice End the proposal registration phase
    /// @dev Only the contract owner can close this phase
    function endProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Registering proposals havent started yet');
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /// @notice Start the voting session
    /// @dev Only the contract owner can initiate the voting session
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, 'Registering proposals phase is not finished');
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    /// @notice End the voting session
    /// @dev Only the contract owner can close the voting session
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /// @notice Tally the votes and determine the winning proposal
    /// @dev Only the contract owner can tally votes at the end of the voting session
    function tallyVotes() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
        uint _winningProposalId;
        for (uint256 p = 0; p < proposalsArray.length; p++) {
            if (proposalsArray[p].voteCount > proposalsArray[_winningProposalId].voteCount) {
               _winningProposalId = p;
            }
        }
        winningProposalID = _winningProposalId;
       
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
}
