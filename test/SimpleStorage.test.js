const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
// Dans la vidéo, Ben install la dépendance ci-dessous (yarn add --dev @nomicfoundation/hardhat-network-helpers) mais moi j'avais pas besoin perso
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("SimpleStorage tests", function() {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployContract() {
        const [owner, otherAccount] = await ethers.getSigners();
        const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
        // L'argument du constructor ci-dessous
        const simpleStorage = await SimpleStorage.deploy(1);

        return { simpleStorage, owner, otherAccount };
    }
    async function deployContract2() {
        const { simpleStorage, owner, otherAccount } = await loadFixture(deployContract);
        // set less than 10 sinon trigger le modifier du getter
        await simpleStorage.setValue(9);
        return { simpleStorage, owner, otherAccount };
    }
    

    describe('Deployment', function(){
        it('Should deploy the SC', async function() {
            const {simpleStorage} = await loadFixture(deployContract)
            expect(await simpleStorage.getValue()).to.equal(1)
        })
    })

    describe('Set&Get', function(){
        let simpleStorage, owner, otherAccount;
        beforeEach(async function () {
            ({ simpleStorage, owner, otherAccount } = await loadFixture(deployContract2));
        });

        it('Should set a new value inside the SC and get it', async function() {
            //const {simpleStorage, owner, otherAccount} = await loadFixture(deployContract)
            const newValue = 5
            await simpleStorage.connect(otherAccount).setValue(newValue)
            const storedValue = await simpleStorage.getValue()
            expect(storedValue).to.equal(newValue)
        })
        // Contexte pas conservé dans un describe ? Réponse : non, utiliser un héritage de fixture ou un hook beforeEach
        it('Should get the value', async function() {
            //const {simpleStorage, owner, otherAccount} = await loadFixture(deployContract)
            const storedValue = await simpleStorage.getValue()
            expect(storedValue).to.equal(9)
        })
    })

    describe('Increment', function(){
        it('Should increment the value', async function() {
            const {simpleStorage, owner, otherAccount} = await loadFixture(deployContract)
            const newValue = 3
            await simpleStorage.connect(owner).setValue(newValue)
            await simpleStorage.connect(otherAccount).increment()
            const storedValue = await simpleStorage.getValue()
            expect(storedValue).to.equal(newValue + 1)
        })
    })

    describe('Modifier infToTen', function(){
        it('Should not be able to get', async function() {
            const {simpleStorage, owner, otherAccount} = await loadFixture(deployContract)
            expect(simpleStorage.getValue()).to.be.reverted
        })
    })

    describe('Event', function(){
        it('Should emit an event when the value is set', async function() {
            const {simpleStorage, owner, otherAccount} = await loadFixture(deployContract)
            await expect(simpleStorage.setValue(4))
            .to.emit(simpleStorage, 'valueSet').withArgs(4)
        })
    })

/*     describe('getCurrentTimestamp', function() {
        it('Should get the time', async function() {
            const {simpleStorage} =  await loadFixture(deployContract)
            await helpers.time.increaseTo(2000000000)
            let getCurrentTimestamp = await simpleStorage.getCurrentTime()
            expect(Number(getCurrentTimestamp)).to.be.equal(2000000000)

            // mine several blocks
            await helpers.mine(1000, { interval: 15 })
            let timestampOfLastBlock = await helpers.time.latest()
            console.log(Number(timestampOfLastBlock))
        })
    }) */
})
