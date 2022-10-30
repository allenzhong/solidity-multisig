import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultisigWallet", function () {

  describe("Deployment", function () {
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
      await expect(
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

    async function deployThreeOwnersFixture() {
      // Contracts are deployed using the first signer/account by default
      const [owner, account1, account2] = await ethers.getSigners();
  
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
  
      const wallet = await MultisigWallet.deploy(
        [owner.address, account1.address, account2.address],
        3
      );
      return { MultisigWallet, wallet, owner, account1, account2 };
    }
  
    it("should add owners and number of confirmations from constructor", async function () {
      const { wallet, owner, account1, account2 } = await loadFixture(deployThreeOwnersFixture); 

      expect(await wallet.isOwner(owner.address)).to.equal(true);
      expect(await wallet.isOwner(account1.address)).to.equal(true);
      expect(await wallet.isOwner(account2.address)).to.equal(true);
      expect(await wallet.numConfirmationsRequired()).to.equal(3);
    });
  });
});
