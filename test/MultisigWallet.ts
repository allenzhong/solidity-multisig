import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultisigWallet", function () {
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const MultisigWallet = await ethers.getContractFactory("MultisigWallet");

    return { MultisigWallet, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should fail if owners are empty", async function () {
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      await expect(MultisigWallet.deploy([], 0)).to.be.revertedWith(
        "owners required"
      );
    });
  });
});
