import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MultisigWallet } from "../typechain-types/MultisigWallet";

describe("MultisigWallet", function () {
  async function deployThreeOwnersFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, notOwner] = await ethers.getSigners();

    const MultisigWallet = await ethers.getContractFactory("MultisigWallet");

    const wallet = await MultisigWallet.deploy(
      [owner.address, account1.address, account2.address],
      3
    );
    return { MultisigWallet, wallet, owner, account1, account2, notOwner };
  }
  describe("Deploy - Constructor", function () {
    it("Should fail if owners are empty", async function () {
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      await expect(MultisigWallet.deploy([], 0)).to.be.revertedWith(
        "owners required"
      );
    });

    it("Should fail if number of confirmation is 0", async function () {
      const [owner, otherAccount] = await ethers.getSigners();
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      await expect(
        MultisigWallet.deploy(
          [owner.getAddress(), otherAccount.getAddress()],
          0
        )
      ).to.be.revertedWith("invalid number of required confirmations");
    });

    it("Should not allow add 0x0 address", async function () {
      const [owner, otherAccount] = await ethers.getSigners();
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      expect(
        MultisigWallet.deploy(
          [
            "0x0000000000000000000000000000000000000000",
            owner.getAddress(),
            otherAccount.getAddress(),
          ],
          3
        )
      ).to.be.revertedWith("invalid owner");
    });

    it("Should not allow owners duplication", async function () {
      const [owner, otherAccount] = await ethers.getSigners();
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      await expect(
        MultisigWallet.deploy(
          [
            otherAccount.getAddress(),
            owner.getAddress(),
            otherAccount.getAddress(),
          ],
          3
        )
      ).to.be.revertedWith("owner not unique");
    });

    it("should add owners and number of confirmations from constructor", async function () {
      const { wallet, owner, account1, account2 } = await loadFixture(
        deployThreeOwnersFixture
      );

      expect(await wallet.isOwner(owner.address)).to.equal(true);
      expect(await wallet.isOwner(account1.address)).to.equal(true);
      expect(await wallet.isOwner(account2.address)).to.equal(true);
      expect(await wallet.numConfirmationsRequired()).to.equal(3);
    });

    it("should get owners from getOwners function", async function () {
      const { wallet, owner, account1, account2 } = await loadFixture(
        deployThreeOwnersFixture
      );

      expect(await wallet.getOwners()).to.deep.equal([
        owner.address,
        account1.address,
        account2.address,
      ]);
    });
  });

  describe("deposit", function () {
    it("should be able to deposit to MultisigWallet contract", async function () {
      const { wallet, owner, account1, account2 } = await loadFixture(
        deployThreeOwnersFixture
      );

      const transactionResp = await owner.sendTransaction({
        to: wallet.address,
        value: ethers.utils.parseEther("1.0"),
        // gasLimit: 1 * 10 ** 6,
        data: "0x",
      });

      const receipt = await transactionResp.wait();

      expect(receipt.logs.length).to.equal(1);
      expect(receipt.logs[0].topics[0]).to.equal(
        "0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15"
      );
      const balance = await wallet.getBalance();
      expect(balance).to.equal(ethers.utils.parseEther("1.0"));
    });
  });

  describe("submitTransaction", function () {
    it("should be unable to call submitTransaction by others", async function () {
      const { wallet, owner, account1, account2, notOwner } = await loadFixture(
        deployThreeOwnersFixture
      );

      expect(await wallet.isOwner(notOwner.address)).to.equal(false);
      await expect(
        wallet
          .connect(notOwner)
          .submitTransaction(account1.address, 0, "0x", { gasLimit: 5000000 })
      ).to.be.revertedWith("not an owner");
    });

    it("should be able to call submitTransaction by one of owners", async function () {
      const { wallet, owner, account1, account2, notOwner } = await loadFixture(
        deployThreeOwnersFixture
      );

      const result = await wallet
        .connect(account1)
        .submitTransaction(account1.address, 0, "0x", { gasLimit: 5000000 });
      const receipt = await result.wait();

      const { events } = receipt;
      expect(events).to.not.be.undefined;
      expect(events?.at(0)?.event).to.equal("SubmitTransaction");
      const transaction = await wallet.transactions(0);
      expect(transaction.to).to.equal(account1.address);
      expect(transaction.value).to.equal(ethers.BigNumber.from(0));
      expect(transaction.data).to.equal("0x");
    });
  });

  describe("confirmTransaction", function () {
    const submittedTxIndex = 0;
    let submitWallet: MultisigWallet;
    let submittedTxOwner: any;
    let submittedToAddress: string;
    let submittedTxNotOwner: any;
    this.beforeEach(async () => {
      const { wallet, owner, account1, account2, notOwner } = await loadFixture(
        deployThreeOwnersFixture
      );
      submitWallet = wallet;
      submittedTxOwner = owner;
      submittedToAddress = account1.address;
      submittedTxNotOwner = notOwner;
      const result = await wallet
        .connect(submittedTxOwner)
        .submitTransaction(submittedToAddress, submittedTxIndex, "0x", {
          gasLimit: 5000000,
        });
      const receipt = await result.wait();
    });

    it('should be unable to call "confirmTransaction" by one who is not owner', async function () {
      await expect(
        submitWallet
          .connect(submittedTxNotOwner)
          .confirmTransaction(submittedTxIndex)
      ).to.be.revertedWith("not an owner");
    });

    it("should check if txIndex exists", async function () {
      await expect(
        submitWallet
          .connect(submittedTxOwner)
          .confirmTransaction(submittedTxIndex + 1, { gasLimit: 5000000 })
      ).to.be.revertedWith("tx does not exist");
    });

    it("should confirm transaction by one of owners", async function () {
      const tx = await submitWallet
        .connect(submittedTxOwner)
        .confirmTransaction(submittedTxIndex, { gasLimit: 5000000 });
      const receipt = await tx.wait();

      const transaction = await submitWallet
        .connect(submittedTxNotOwner)
        .transactions(submittedTxIndex);

      expect(transaction).to.not.undefined;
      expect(transaction.numConfirmations.toNumber()).to.equal(1);
      expect(transaction.to).to.equal(submittedToAddress);
      expect(transaction.executed).to.equal(false);

      const { events } = receipt;
      const event = events?.at(0);

      expect(event?.event).to.equal("ConfirmTransaction");
    });
  });
});
