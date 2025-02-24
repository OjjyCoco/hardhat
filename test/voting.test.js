const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
    async function deployContract() {
        const [owner, voter1, voter2, voter3] = await ethers.getSigners();
        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy();

        return { voting, owner, voter1, voter2, voter3 };
    }

    describe("Deployment", function () {
        it("Should deploy the contract and have initial values", async function () {
            const { voting } = await loadFixture(deployContract);
            expect(await voting.workflowStatus()).to.equal(0); // RegisteringVoters
        });
    });

    describe("Voter Registration", function () {
        let voting, owner, voter1;
        beforeEach(async function () {
            ({ voting, owner, voter1 } = await loadFixture(deployContract));
        });

        it("Should register a voter", async function () {
            await voting.addVoter(voter1.address);
            const voter = await voting.connect(voter1).getVoter(voter1.address);
            expect(voter.isRegistered).to.be.true;
        });
        
        it("Should emit an event when registering a voter", async function () {
            await expect(voting.addVoter(voter1.address))
            .to.emit(voting, 'VoterRegistered').withArgs(voter1.address);
        });

        // Peut-on faire les deux étapes ci-dessus en une seule ?
        // C.à.d faire seulement le deuxième it et considérer que si le test de l'event passe
        // alors celui du register aussi ?
        // Je considère que oui dans la suite du code
        
        it("Should revert when not the owner", async function () {
            await expect(voting.connect(voter1).addVoter(owner.address)).to.be.reverted;
        });
        
        it("Should revert when not the right WorkflowStatus", async function () {
            await voting.startProposalsRegistering();
            await expect(voting.addVoter(owner.address)).to.be.reverted;
        });
    });

    describe("Proposal Registration", function () {
        let voting, owner, voter1;
        beforeEach(async function () {
            ({ voting, owner, voter1 } = await loadFixture(deployContract));
        });

        it("Should revert because wrong WorkflowStatus for startProposalsRegistering", async function () {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await expect(voting.startProposalsRegistering()).to.be.reverted;
        });

        it("Should revert because wrong WorkflowStatus for endProposalsRegistering", async function () {
            await expect(voting.endProposalsRegistering()).to.be.reverted;
        });

        it("Should start proposals registration", async function () {
            await voting.startProposalsRegistering();
            expect(await voting.workflowStatus()).to.equal(1);
        });

        it("Should register a proposal", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1")
            // expect(await voting.connect(voter1).getOneProposal(1).description).to.equal("Proposal 1")
            // Pourquoi la ligne ci-dessus fail ? AssertionError: expected undefined to equal 'Proposal 1'
            const proposal = await voting.connect(voter1).getOneProposal(1); // Résolution de la promesse
            expect(proposal.description).to.equal("Proposal 1");
        });
        
        it("Should emit an event when registering a proposal", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await expect(voting.connect(voter1).addProposal("Proposal 1"))
            // le Propsal 0 est le proposal GENESIS
            .to.emit(voting, 'ProposalRegistered').withArgs(1);
        });
        
        it("Should revert when not a registered voter", async function () {
            await voting.startProposalsRegistering();
            await expect(voting.connect(voter1).addProposal("Proposal 1")).to.be.reverted;
        });

        it("Should revert when proposing nothing", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await expect(voting.connect(voter1).addProposal("")).to.be.reverted;
        });

        it("Should create the GENESIS proposal on startProposalsRegistering WF status", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            const proposal = await voting.connect(voter1).getOneProposal(0); // Résolution de la promesse
            await expect(proposal.description).to.equal("GENESIS");
        });

    });

    describe("Voting", function () {
        let voting, owner, voter1;
        beforeEach(async function () {
            ({ voting, owner, voter1 } = await loadFixture(deployContract));
        });

        it("Should revert because wrong WorkflowStatus for startVotingSession", async function () {
            await expect(voting.startVotingSession()).to.be.reverted;
        });

        it("Should revert because wrong WorkflowStatus for endVotingSession", async function () {
            await expect(voting.endVotingSession()).to.be.reverted;
        });

        it("Should emit an event when a voter has voted", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await expect(voting.connect(voter1).setVote(0))
            .to.emit(voting, 'Voted').withArgs(voter1.address, 0);
        });

        it("Should allow registered voters to vote", async function () {
            await voting.addVoter(voter1.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(voter1).setVote(0);
            const voter = await voting.connect(voter1).getVoter(voter1.address);
            expect(voter.hasVoted).to.be.true;
        });
        
        it("Should revert when voting before session starts", async function () {
            await voting.addVoter(voter1.address);
            await expect(voting.connect(voter1).setVote(0)).to.be.reverted;
        });

        it("Should revert when voter has already voted", async function () {
            await voting.addVoter(voter1.address);
            voting.connect(voter1).setVote(0)
            await expect(voting.connect(voter1).setVote(0)).to.be.reverted;
        });
    });

    // Un peu bidon celui-là
    describe("Workflow Status Changes", function () {

        it("Should emit event when transitioning through all workflow statuses", async function () {
            const { voting } = await loadFixture(deployContract);
            await expect(voting.startProposalsRegistering())
            .to.emit(voting, 'WorkflowStatusChange');
            await expect(voting.endProposalsRegistering())
            .to.emit(voting, 'WorkflowStatusChange');
            await expect(voting.startVotingSession())
            .to.emit(voting, 'WorkflowStatusChange');
            await expect(voting.endVotingSession())
            .to.emit(voting, 'WorkflowStatusChange');
            await expect(voting.tallyVotes())
            .to.emit(voting, 'WorkflowStatusChange');
            expect(await voting.workflowStatus()).to.equal(5); // VotesTallied
        });

        // Honnêtement un peu la flemme de tester tous les require de tous les changement de status
        // Il y a pas une façon rapide / factorisée de le faire?
        
    });

    describe("Tally Votes", function () {

        it("Should determine the winning proposal (the first when draw)", async function () {
            const { voting, voter1, voter2 } = await loadFixture(deployContract);
            await voting.addVoter(voter1.address);
            await voting.addVoter(voter2.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1");
            await voting.connect(voter1).addProposal("Proposal 2");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(voter1).setVote(0);
            await voting.connect(voter2).setVote(1);
            await voting.endVotingSession();
            await expect(voting.tallyVotes())
            .to.emit(voting, 'WorkflowStatusChange');
            // Draw, the first is 0
            expect(await voting.winningProposalID()).to.equal(0);
        });

        it("Should determine the winning proposal (the second is the winner)", async function () {
            const { voting, voter1, voter2, voter3 } = await loadFixture(deployContract);
            await voting.addVoter(voter1.address);
            await voting.addVoter(voter2.address);
            await voting.addVoter(voter3.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1");
            await voting.connect(voter1).addProposal("Proposal 2");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(voter1).setVote(0);
            await voting.connect(voter2).setVote(1);
            await voting.connect(voter3).setVote(1);
            await voting.endVotingSession();
            await expect(voting.tallyVotes())
            .to.emit(voting, 'WorkflowStatusChange');
            // No draw, the winner is Proposal 2
            expect(await voting.winningProposalID()).to.equal(1);
        });

        // Pas besoin de faire le cas : Should determine the winning proposal (the first is the winner)
        // Car les mêmes branch sont testées par Should determine the winning proposal (the first when draw)

        it("Should revert because wrong WorkflowStatus for tallyVotes", async function () {
            const { voting, voter1 } = await loadFixture(deployContract);
            await expect(voting.tallyVotes()).to.be.reverted;
        });

        it("Should revert when not the Owner", async function () {
            const { voting, voter1 } = await loadFixture(deployContract);
            await voting.addVoter(voter1.address);
            await expect(voting.connect(voter1).tallyVotes()).to.be.reverted;
        });

    });
});
